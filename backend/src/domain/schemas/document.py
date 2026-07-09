"""文档/笔记接口的数据结构。"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from src.application.note_prompts import NoteType


class GenerateNoteRequest(BaseModel):
    """从聊天消息生成笔记的请求体。"""

    messages: list[dict] = Field(
        default_factory=list,
        description="聊天会话中的 {role, content} 消息列表",
    )
    note_type: NoteType = Field(
        default="general",
        description="笔记生成类型：general、wechat_article、video_script、xiaohongshu",
    )


class NoteOut(BaseModel):
    """返回给前端的笔记。"""

    id: str
    title: str
    preview: str
    tag: str
    is_pinned: bool
    content: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: object) -> str:
        """将 UUID 转成字符串，便于 JSON 序列化。"""
        return str(v)


class CreateNoteRequest(BaseModel):
    """手动创建笔记的请求体。"""

    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    tag: str = "学习"
