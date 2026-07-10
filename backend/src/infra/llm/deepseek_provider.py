"""DeepSeek LLM provider — OpenAI-compatible streaming.

DeepSeek uses the OpenAI protocol so we drive it with the ``openai`` SDK
and a custom ``base_url``.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import structlog
from openai import AsyncOpenAI

from src.infra.config import get_settings
from src.infra.llm.base import LLMProvider

logger = structlog.get_logger()


@dataclass(frozen=True)
class LLMToolCall:
    """模型请求执行的单个工具调用。"""

    id: str
    name: str
    arguments: str


@dataclass(frozen=True)
class LLMToolResponse:
    """一次非流式 Agent 决策的结构化响应。"""

    content: str | None
    tool_calls: list[LLMToolCall]


class DeepSeekProvider:
    """OpenAI-compatible provider targeting the DeepSeek API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        self._default_model = settings.llm_default_model

    def _resolve_model(self, model: str | None) -> str:
        """将历史会话中的已弃用模型别名映射到当前默认模型。"""
        if model in {"deepseek-chat", "deepseek-reasoner"}:
            return self._default_model
        return model or self._default_model

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream tokens from the DeepSeek chat completions endpoint."""
        model = self._resolve_model(model)

        logger.info(
            "llm_request_start",
            model=model,
            message_count=len(messages),
        )

        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                stream_options={"include_usage": True},
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content

        except Exception as exc:
            logger.error(
                "llm_request_failed",
                model=model,
                error=str(exc),
                exc_info=True,
            )
            raise

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> LLMToolResponse:
        """执行一轮 Agent 决策，并返回模型要求的工具调用。"""
        model = self._resolve_model(model)
        logger.info(
            "llm_tool_request_start",
            model=model,
            message_count=len(messages),
            tool_count=len(tools),
        )

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools,
                tool_choice="required",
                stream=False,
            )
            message = response.choices[0].message
            tool_calls = [
                LLMToolCall(
                    id=tool_call.id,
                    name=tool_call.function.name,
                    arguments=tool_call.function.arguments,
                )
                for tool_call in message.tool_calls or []
            ]
            logger.info(
                "llm_tool_request_done",
                model=model,
                tool_call_count=len(tool_calls),
            )
            return LLMToolResponse(
                content=message.content,
                tool_calls=tool_calls,
            )
        except Exception as exc:
            logger.error(
                "llm_tool_request_failed",
                model=model,
                error=str(exc),
                exc_info=True,
            )
            raise

    async def chat_sync(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
    ) -> str:
        """Non-streaming chat — returns the full response at once.

        Suitable for note generation, summarization, and other tasks
        where tokens don't need to be displayed in real time.
        """
        model = self._resolve_model(model)

        logger.info(
            "llm_sync_request_start",
            model=model,
            message_count=len(messages),
        )

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                stream=False,
            )
            content = response.choices[0].message.content or ""
            logger.info(
                "llm_sync_request_done",
                model=model,
                token_usage=response.usage.total_tokens if response.usage else 0,
            )
            return content

        except Exception as exc:
            logger.error(
                "llm_sync_request_failed",
                model=model,
                error=str(exc),
                exc_info=True,
            )
            raise
