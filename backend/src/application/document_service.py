"""Document service — CRUD + AI-powered note generation from chat."""

import uuid

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.document import Document
from src.domain.schemas.document import GenerateNoteRequest
from src.infra.llm.deepseek_provider import DeepSeekProvider

logger = structlog.get_logger()

NOTE_SYSTEM_PROMPT = (
    "你是一个知识整理专家。用户会提供一段对话记录，请你将其整理为结构化的笔记。\n\n"
    "要求：\n"
    "1. 用 Markdown 格式输出\n"
    "2. 提取对话中的关键话题、核心观点和重要结论\n"
    "3. 按主题组织内容，使用标题层级\n"
    "4. 保留原文中的关键数据和引用\n"
    "5. 最后附上一个合适的标签（从以下选一：学习、工作、想法、收藏）\n\n"
    "输出格式：\n"
    "## 标题\n"
    "...正文...\n"
    "---\n"
    "标签: [标签名]"
)

_provider: DeepSeekProvider | None = None


def _get_provider() -> DeepSeekProvider:
    global _provider
    if _provider is None:
        _provider = DeepSeekProvider()
    return _provider


class DocumentService:
    """Handles document CRUD and AI-powered generation."""

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    @classmethod
    async def list_documents(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """Return paginated documents for a user, newest first."""
        offset = (page - 1) * page_size

        count_q = (
            select(func.count(Document.id))
            .where(Document.user_id == user_id)
        )
        total = (await db.execute(count_q)).scalar() or 0

        q = (
            select(Document)
            .where(Document.user_id == user_id)
            .order_by(Document.updated_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        documents = list((await db.execute(q)).scalars().all())

        return {
            "data": documents,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }

    @classmethod
    async def get_document(
        cls, db: AsyncSession, user_id: str, doc_id: str
    ) -> Document:
        """Get a single document, ensuring ownership."""
        q = select(Document).where(
            Document.id == doc_id, Document.user_id == user_id
        )
        doc = (await db.execute(q)).scalar_one_or_none()
        if doc is None:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    @classmethod
    async def create_document(
        cls,
        db: AsyncSession,
        user_id: str,
        title: str,
        content: str = "",
        tag: str = "学习",
    ) -> Document:
        """Manually create a document."""
        doc = Document(
            user_id=user_id,
            title=title,
            content=content,
            preview=_make_preview(content),
            tag=tag,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @classmethod
    async def delete_document(
        cls, db: AsyncSession, user_id: str, doc_id: str
    ) -> None:
        """Delete a document owned by the user."""
        doc = await cls.get_document(db, user_id, doc_id)
        await db.delete(doc)
        await db.commit()

    # ------------------------------------------------------------------
    # AI Generation
    # ------------------------------------------------------------------

    @classmethod
    async def generate_from_chat(
        cls,
        db: AsyncSession,
        user_id: str,
        req: GenerateNoteRequest,
    ) -> Document:
        """Generate a structured note from chat messages using LLM."""
        # 1. Build the prompt from messages
        conversation = _format_conversation(req.messages)
        llm_messages = [
            {"role": "system", "content": NOTE_SYSTEM_PROMPT},
            {"role": "user", "content": f"请整理以下对话：\n\n{conversation}"},
        ]

        # 2. Call LLM (non-streaming — 一次返回完整笔记)
        provider = _get_provider()
        try:
            full_content = await provider.chat_sync(llm_messages)
        except Exception as exc:
            logger.error("note_generation_failed", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM request failed — please try again",
            ) from exc

        # 3. Parse title, tag, and preview from the LLM output
        title = _extract_title(full_content)
        tag = _extract_tag(full_content)
        preview = _make_preview(full_content)

        # 4. Create the document
        doc = Document(
            user_id=user_id,
            title=title,
            content=full_content,
            preview=preview,
            tag=tag,
            status="ready",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        logger.info(
            "note_generated",
            doc_id=str(doc.id),
            title=title,
            tag=tag,
        )
        return doc


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _format_conversation(messages: list[dict]) -> str:
    """Format a list of {role, content} dicts into a readable transcript."""
    lines: list[str] = []
    for m in messages:
        role_label = {"user": "👤 用户", "assistant": "🤖 AI", "system": "📋 系统"}.get(
            m.get("role", ""), m.get("role", "")
        )
        lines.append(f"**{role_label}**：{m.get('content', '')}")
    return "\n\n".join(lines)


def _extract_title(content: str) -> str:
    """Extract a title from the first heading in the generated content."""
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            return stripped[3:].strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    # Fallback: first non-empty line, truncated
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped and not stripped.startswith("---"):
            return stripped[:50] + ("…" if len(stripped) > 50 else "")
    return "对话笔记"


def _extract_tag(content: str) -> str:
    """Extract the tag from the '标签: xxx' marker."""
    valid_tags = {"学习", "工作", "想法", "收藏"}
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("标签:") or stripped.startswith("标签："):
            tag = stripped.split(":", 1)[-1].split("：", 1)[-1].strip()
            if tag in valid_tags:
                return tag
    return "学习"


def _make_preview(content: str) -> str:
    """Create a short preview by stripping markdown and truncating."""
    # Remove headings, code blocks, and horizontal rules
    cleaned = []
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("```") or stripped.startswith("---"):
            continue
        if stripped.startswith("标签"):
            continue
        if stripped:
            cleaned.append(stripped)
    text = " ".join(cleaned)
    return text[:200] + ("…" if len(text) > 200 else "")
