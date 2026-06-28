"""Structured logging configuration via structlog."""

import logging

import structlog


def setup_logging(level: str = "DEBUG") -> None:
    """Configure structlog for the application.

    In development (DEBUG / INFO) we use a coloured console renderer.
    In production (WARNING+) we emit JSON for log aggregation tools.
    """
    log_level = getattr(logging, level.upper(), logging.DEBUG)

    # Configure stdlib logging first so structlog can route through it
    logging.basicConfig(
        format="%(message)s",
        level=log_level,
    )

    is_development = log_level <= logging.INFO

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer()
            if is_development
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
