"""博查 Web Search API 接入。"""

import httpx
import structlog

from src.infra.config import get_settings
from src.infra.search.schemas import SearchMetadata, SearchResult

logger = structlog.get_logger()


class BochaSearchProvider:
    """调用博查 Web Search API 的国内搜索实现。"""

    provider_name = "bocha"
    region = "mainland"

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.bocha_api_key
        self._endpoint = settings.bocha_search_endpoint
        self._count = max(1, min(settings.search_max_results, 50))
        self._timeout = settings.search_timeout_seconds

    async def search(self, query: str) -> SearchMetadata:
        """调用博查搜索；异常会转换为 failed 元数据。"""
        if not self._api_key:
            return SearchMetadata(
                enabled=True,
                provider=self.provider_name,
                region=self.region,
                status="disabled",
                error="BOCHA_API_KEY is not configured",
            )

        payload = {
            "query": query,
            "freshness": "noLimit",
            "summary": True,
            "count": self._count,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    self._endpoint,
                    headers=headers,
                    json=payload,
                )
            try:
                body = response.json()
            except ValueError:
                body = {}
        except Exception as exc:
            logger.warning("bocha_search_failed", error=str(exc))
            return SearchMetadata(
                enabled=True,
                provider=self.provider_name,
                region=self.region,
                status="failed",
                error=str(exc),
            )

        if response.status_code >= 400:
            error = body.get("msg") or body.get("message") or response.text
            return SearchMetadata(
                enabled=True,
                provider=self.provider_name,
                region=self.region,
                status="failed",
                error=str(error),
                log_id=body.get("log_id"),
            )

        if str(body.get("code")) != "200":
            error = body.get("msg") or body.get("message") or "Bocha search failed"
            return SearchMetadata(
                enabled=True,
                provider=self.provider_name,
                region=self.region,
                status="failed",
                error=str(error),
                log_id=body.get("log_id"),
            )

        values = (
            body.get("data", {})
            .get("webPages", {})
            .get("value", [])
        )
        sources = [self._map_result(item) for item in values if item.get("url")]
        status = "success" if sources else "empty"
        return SearchMetadata(
            enabled=True,
            provider=self.provider_name,
            region=self.region,
            status=status,
            sources=sources,
            log_id=body.get("log_id"),
        )

    def _map_result(self, item: dict) -> SearchResult:
        snippet = item.get("summary") or item.get("snippet") or ""
        published_at = item.get("datePublished") or item.get("dateLastCrawled")
        return SearchResult(
            title=item.get("name") or item.get("url") or "未命名网页",
            url=item.get("url") or "",
            snippet=snippet,
            source=self.provider_name,
            region=self.region,
            site_name=item.get("siteName"),
            site_icon=item.get("siteIcon"),
            published_at=published_at,
        )
