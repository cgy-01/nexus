"""搜索供应商抽象。"""

from typing import Protocol

from src.infra.search.schemas import SearchMetadata


class SearchProvider(Protocol):
    """所有搜索供应商需要实现的统一接口。"""

    provider_name: str
    region: str

    async def search(self, query: str) -> SearchMetadata:
        """执行搜索并返回归一化结果。"""
        ...
