"""文档服务：笔记 CRUD 与 AI 生成。"""

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.note_prompts import get_note_skill_prompt
from src.domain.models.document import Document
from src.domain.schemas.document import GenerateNoteRequest
from src.infra.llm.deepseek_provider import DeepSeekProvider

logger = structlog.get_logger()

_provider: DeepSeekProvider | None = None


def _get_provider() -> DeepSeekProvider:
    global _provider
    if _provider is None:
        _provider = DeepSeekProvider()
    return _provider


class DocumentService:
    """处理笔记 CRUD 和 AI 生成。"""

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
        """按更新时间倒序返回用户笔记分页。"""
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
        """获取单篇笔记，并校验归属。"""
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
        """手动创建笔记。"""
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
        """删除用户自己的笔记。"""
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
        """使用 LLM 从聊天消息生成结构化笔记。"""
        conversation = _format_conversation(req.messages)
        llm_messages = [
            {"role": "system", "content": get_note_skill_prompt(req.note_type)},
            {"role": "user", "content": f"请整理以下对话：\n\n{conversation}"},
        ]

        provider = _get_provider()
        try:
            full_content = await provider.chat_sync(llm_messages)
        except Exception as exc:
            logger.error("note_generation_failed", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM request failed — please try again",
            ) from exc

        title = _extract_title(full_content)
        tag = _extract_tag(full_content)
        preview = _make_preview(full_content)

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
            note_type=req.note_type,
        )
        return doc


def _format_conversation(messages: list[dict]) -> str:
    """将 {role, content} 消息列表格式化成可读转写文本。"""
    lines: list[str] = []
    for m in messages:
        role_label = {"user": "👤 用户", "assistant": "🤖 AI", "system": "📋 系统"}.get(
            m.get("role", ""), m.get("role", "")
        )
        lines.append(f"**{role_label}**：{m.get('content', '')}")
    return "\n\n".join(lines)


def _extract_title(content: str) -> str:
    """从生成内容的第一个标题中提取笔记标题。"""
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            return stripped[3:].strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped and not stripped.startswith("---"):
            return stripped[:50] + ("…" if len(stripped) > 50 else "")
    return "对话笔记"


def _extract_tag(content: str) -> str:
    """从「标签: xxx」标记中提取笔记标签。"""
    valid_tags = {"学习", "工作", "想法", "收藏"}
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("标签:") or stripped.startswith("标签："):
            tag = stripped.split(":", 1)[-1].split("：", 1)[-1].strip()
            if tag in valid_tags:
                return tag
    return "学习"


def _make_preview(content: str) -> str:
    """移除 Markdown 标记并生成短预览。"""
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
