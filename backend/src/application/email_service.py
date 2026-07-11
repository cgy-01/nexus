"""SMTP delivery for email authentication codes."""

import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from fastapi import HTTPException, status

from src.infra.config import Settings


async def send_login_code(*, recipient: str, code: str, settings: Settings) -> None:
    """Send a single-use login code without exposing SMTP credentials to clients."""
    if not settings.smtp_host or not settings.smtp_from_address:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="邮箱登录服务尚未配置",
        )

    message = EmailMessage()
    message["Subject"] = "Nexus AI 登录验证码"
    message["From"] = settings.smtp_from_address
    message["To"] = recipient
    message.set_content(
        f"你的 Nexus AI 登录验证码是：{code}\n\n"
        f"验证码将在 {settings.email_code_expire_minutes} 分钟后失效。"
        "如非本人操作，请忽略此邮件。"
    )

    try:
        await asyncio.to_thread(_send_message, message, settings)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="验证码邮件发送失败，请稍后重试",
        ) from exc


def _send_message(message: EmailMessage, settings: Settings) -> None:
    context = ssl.create_default_context()
    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP

    with smtp_class(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout_seconds,
    ) as client:
        if settings.smtp_starttls and not settings.smtp_use_ssl:
            client.starttls(context=context)
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
