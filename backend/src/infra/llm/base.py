"""LLM Provider protocol — swap implementations without changing callers."""

from collections.abc import AsyncIterator
from typing import Any, Protocol


class LLMProvider(Protocol):
    """Async protocol for LLM chat streaming.

    Implementations (DeepSeek, OpenAI, Azure, local models) must
    conform to this interface so ``ChatService`` never imports a
    concrete provider.
    """

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream chat completion tokens.

        Args:
            messages: Standard chat messages ``[{"role":"system",...}, ...]``.
            model: Override the default model if needed.

        Yields:
            Content chunks (may be partial tokens or words).
        """
        ...
        yield ""  # pragma: no cover — protocol marker
