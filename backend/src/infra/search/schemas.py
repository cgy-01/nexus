"""联网搜索的数据结构。"""

from typing import Literal

from pydantic import BaseModel, Field


SearchRegion = Literal["mainland", "auto"]
SearchStatus = Literal["success", "empty", "failed", "disabled"]


class SearchResult(BaseModel):
    """归一化后的搜索结果。"""

    title: str
    url: str
    snippet: str = ""
    source: str = "bocha"
    region: str = "mainland"
    site_name: str | None = None
    site_icon: str | None = None
    published_at: str | None = None
    score: float | None = None


class SearchMetadata(BaseModel):
    """一次搜索调用的结果摘要。"""

    enabled: bool = False
    provider: str | None = None
    region: str = "mainland"
    status: SearchStatus = "disabled"
    sources: list[SearchResult] = Field(default_factory=list)
    error: str | None = None
    log_id: str | None = None
