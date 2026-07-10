"""联网调研 Agent 的行为测试。"""

from types import SimpleNamespace

import pytest

from src.application.research_agent import AgentEvent, ResearchAgent, ResearchResult
from src.infra.llm.deepseek_provider import LLMToolCall, LLMToolResponse
from src.infra.search.schemas import SearchMetadata, SearchResult


class FakeProvider:
    """按预置顺序返回工具调用。"""

    def __init__(self, responses: list[LLMToolResponse]) -> None:
        self._responses = responses
        self.messages: list[list[dict]] = []

    async def chat_with_tools(self, messages, tools, model):
        self.messages.append(messages)
        return self._responses.pop(0)


class FakeSearchRouter:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def search(self, query, region, freshness, count):
        self.calls.append(
            {
                "query": query,
                "region": region,
                "freshness": freshness,
                "count": count,
            }
        )
        return SearchMetadata(
            enabled=True,
            provider="bocha",
            region="mainland",
            status="success",
            sources=[
                SearchResult(
                    title="测试来源",
                    url="https://example.com/article?from=search",
                    snippet="测试摘要",
                )
            ],
        )


@pytest.mark.asyncio
async def test_agent_can_search_then_finish() -> None:
    provider = FakeProvider(
        [
            LLMToolResponse(
                content=None,
                tool_calls=[
                    LLMToolCall(
                        id="call-search",
                        name="search_web",
                        arguments='{"query":"最新 AI 新闻","freshness":"oneDay","count":3}',
                    )
                ],
            ),
            LLMToolResponse(
                content=None,
                tool_calls=[
                    LLMToolCall(
                        id="call-finish",
                        name="finish_research",
                        arguments='{"reason":"资料足够"}',
                    )
                ],
            ),
        ]
    )
    router = FakeSearchRouter()
    agent = ResearchAgent(provider, router)  # type: ignore[arg-type]
    agent._settings = SimpleNamespace(
        agent_timeout_seconds=10,
        agent_max_steps=4,
        agent_max_searches=3,
        agent_max_sources=12,
    )

    events = [
        event
        async for event in agent.run(
            [{"role": "user", "content": "查一下 AI 新闻"}],
            model="test-model",
            region="mainland",
        )
    ]

    result = next(event for event in events if isinstance(event, ResearchResult))
    assert router.calls == [
        {
            "query": "最新 AI 新闻",
            "region": "mainland",
            "freshness": "oneDay",
            "count": 3,
        }
    ]
    assert result.search_metadata is not None
    assert len(result.search_metadata.sources) == 1
    assert result.trace["stop_reason"] == "finish_research"
    assert any(
        isinstance(event, AgentEvent) and event.data["stage"] == "answering"
        for event in events
    )


@pytest.mark.asyncio
async def test_agent_rejects_invalid_search_arguments() -> None:
    provider = FakeProvider(
        [
            LLMToolResponse(
                content=None,
                tool_calls=[
                    LLMToolCall(
                        id="call-search",
                        name="search_web",
                        arguments='{"query":"x"}',
                    )
                ],
            ),
            LLMToolResponse(
                content=None,
                tool_calls=[
                    LLMToolCall(
                        id="call-finish",
                        name="finish_research",
                        arguments='{"reason":"参数无效"}',
                    )
                ],
            ),
        ]
    )
    router = FakeSearchRouter()
    agent = ResearchAgent(provider, router)  # type: ignore[arg-type]
    agent._settings = SimpleNamespace(
        agent_timeout_seconds=10,
        agent_max_steps=4,
        agent_max_searches=3,
        agent_max_sources=12,
    )

    events = [
        event
        async for event in agent.run(
            [{"role": "user", "content": "测试"}],
            model="test-model",
            region="mainland",
        )
    ]

    result = next(event for event in events if isinstance(event, ResearchResult))
    assert router.calls == []
    assert result.search_metadata is not None
    assert result.search_metadata.status == "failed"
    assert result.trace["calls"][0]["status"] == "invalid_arguments"
