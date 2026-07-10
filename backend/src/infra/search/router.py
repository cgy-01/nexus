"""按区域路由到具体搜索供应商。"""

from src.infra.config import get_settings
from src.infra.search.bocha_provider import BochaSearchProvider
from src.infra.search.schemas import SearchMetadata, SearchRegion


class SearchRouter:
    """搜索供应商路由器。"""

    def __init__(self) -> None:
        self._settings = get_settings()

    async def search(
        self,
        query: str,
        region: SearchRegion = "mainland",
        freshness: str = "noLimit",
        count: int | None = None,
    ) -> SearchMetadata:
        """根据区域选择搜索实现。"""
        resolved_region = (
            self._settings.search_default_region
            if region == "auto"
            else region
        )
        if not self._settings.search_enabled:
            return SearchMetadata(
                enabled=True,
                provider=None,
                region=resolved_region,
                status="disabled",
                error="Search is disabled",
            )

        if resolved_region != "mainland":
            return SearchMetadata(
                enabled=True,
                provider=None,
                region=resolved_region,
                status="failed",
                error=f"Unsupported search region: {resolved_region}",
            )

        provider_name = self._settings.search_provider_mainland
        if provider_name != "bocha":
            return SearchMetadata(
                enabled=True,
                provider=provider_name,
                region=resolved_region,
                status="failed",
                error=f"Unsupported mainland search provider: {provider_name}",
            )

        return await BochaSearchProvider().search(
            query,
            freshness=freshness,
            count=count,
        )
