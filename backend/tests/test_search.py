"""联网搜索能力的单元测试。"""

import pytest

from src.application.chat_service import _format_search_context
from src.infra.search.bocha_provider import BochaSearchProvider
from src.infra.search.schemas import SearchMetadata, SearchResult


def test_bocha_result_mapping_prefers_summary() -> None:
    provider = BochaSearchProvider()

    result = provider._map_result(
        {
            "name": "测试标题",
            "url": "https://example.com/a",
            "snippet": "短摘要",
            "summary": "完整摘要",
            "siteName": "示例站点",
            "siteIcon": "https://example.com/favicon.ico",
            "datePublished": "2026-07-10T12:00:00+08:00",
        }
    )

    assert result.title == "测试标题"
    assert result.url == "https://example.com/a"
    assert result.snippet == "完整摘要"
    assert result.site_name == "示例站点"
    assert result.site_icon == "https://example.com/favicon.ico"
    assert result.published_at == "2026-07-10T12:00:00+08:00"


@pytest.mark.asyncio
async def test_bocha_search_without_api_key_degrades_to_disabled(monkeypatch) -> None:
    provider = BochaSearchProvider()
    monkeypatch.setattr(provider, "_api_key", "")

    metadata = await provider.search("测试")

    assert metadata.enabled is True
    assert metadata.provider == "bocha"
    assert metadata.region == "mainland"
    assert metadata.status == "disabled"
    assert metadata.sources == []
    assert metadata.error


def test_format_search_context_uses_citation_numbers() -> None:
    metadata = SearchMetadata(
        enabled=True,
        provider="bocha",
        region="mainland",
        status="success",
        sources=[
            SearchResult(
                title="第一条来源",
                url="https://example.com/1",
                snippet="来源摘要",
                site_name="示例站点",
            )
        ],
    )

    context = _format_search_context(metadata)

    assert "[1] 第一条来源" in context
    assert "https://example.com/1" in context
    assert "来源摘要" in context
