"""DeepSeek LLM provider — OpenAI-compatible streaming.

DeepSeek uses the OpenAI protocol so we drive it with the ``openai`` SDK
and a custom ``base_url``.
"""

from collections.abc import AsyncIterator

import structlog
from openai import AsyncOpenAI

from src.infra.config import get_settings
from src.infra.llm.base import LLMProvider

logger = structlog.get_logger()


class DeepSeekProvider:
    """OpenAI-compatible provider targeting the DeepSeek API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        self._default_model = settings.llm_default_model

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream tokens from the DeepSeek chat completions endpoint."""
        model = model or self._default_model

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

    async def chat_sync(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> str:
        """Non-streaming chat — returns the full response at once.

        Suitable for note generation, summarization, and other tasks
        where tokens don't need to be displayed in real time.
        """
        model = model or self._default_model

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
