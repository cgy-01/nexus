"""Authentication business logic.

All methods receive a database session as their first parameter and
return Pydantic schema instances — never ORM objects directly.
"""

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone

import redis.asyncio as aioredis
import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.email_service import send_login_code
from src.domain.models.auth_identity import AuthIdentity
from src.domain.models.refresh_token import RefreshToken
from src.domain.models.user import User
from src.domain.schemas.auth import AuthData, MessageData, TokenData
from src.domain.schemas.user import UserResponse
from src.infra.config import Settings, get_settings
from src.infra.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

logger = structlog.get_logger()


class AuthService:
    """Stateless authentication service.

    All public methods are classmethods that accept ``db`` as first argument.
    """

    @classmethod
    async def register(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> AuthData:
        """Create a password account until verified email login is enabled."""
        settings = get_settings()
        normalized_email = _normalize_email(email)

        existing = await db.execute(select(User).where(User.email == normalized_email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="该邮箱已注册",
            )

        user = User(
            email=normalized_email,
            hashed_password=hash_password(password),
            display_name=display_name,
            uid=await _generate_uid(db),
        )
        db.add(user)
        await db.flush()
        db.add(AuthIdentity(user_id=user.id, provider="email", subject=normalized_email))

        logger.info("user_registered", user_id=str(user.id))
        return cls._issue_auth_data(db, user, settings)

    @classmethod
    async def login(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
    ) -> AuthData:
        """Authenticate a password account."""
        settings = get_settings()
        normalized_email = _normalize_email(email)
        result = await db.execute(select(User).where(User.email == normalized_email))
        user = result.scalar_one_or_none()

        if user is None or user.hashed_password is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="邮箱或密码错误",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="用户账号已停用",
            )

        logger.info("user_logged_in", user_id=str(user.id))
        return cls._issue_auth_data(db, user, settings)

    @classmethod
    async def request_email_code(
        cls,
        redis_client: aioredis.Redis,
        email: str,
    ) -> MessageData:
        """Send a rate-limited, single-use code to a verified email inbox."""
        settings = get_settings()
        normalized_email = _normalize_email(email)
        cooldown_key = _email_code_cooldown_key(normalized_email)

        if await redis_client.exists(cooldown_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="验证码发送过于频繁，请稍后再试",
            )

        code = f"{secrets.randbelow(1_000_000):06d}"
        await send_login_code(recipient=normalized_email, code=code, settings=settings)

        payload = json.dumps({"digest": _code_digest(normalized_email, code, settings), "attempts": 0})
        await redis_client.set(
            _email_code_key(normalized_email),
            payload,
            ex=settings.email_code_expire_minutes * 60,
        )
        await redis_client.set(
            cooldown_key,
            "1",
            ex=settings.email_code_resend_seconds,
        )

        logger.info("email_login_code_sent")
        return MessageData(message="验证码已发送，请查收邮箱")

    @classmethod
    async def verify_email_code(
        cls,
        db: AsyncSession,
        redis_client: aioredis.Redis,
        email: str,
        code: str,
    ) -> AuthData:
        """Verify an email code, then sign in or create the corresponding user."""
        settings = get_settings()
        normalized_email = _normalize_email(email)
        key = _email_code_key(normalized_email)
        raw_payload = await redis_client.get(key)

        if raw_payload is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码无效或已过期",
            )

        try:
            payload = json.loads(raw_payload)
            attempts = int(payload["attempts"])
            expected_digest = str(payload["digest"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            await redis_client.delete(key)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码无效或已过期",
            ) from None

        if attempts >= settings.email_code_max_attempts:
            await redis_client.delete(key)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码无效或已过期",
            )

        if not hmac.compare_digest(expected_digest, _code_digest(normalized_email, code, settings)):
            payload["attempts"] = attempts + 1
            await redis_client.set(key, json.dumps(payload), keepttl=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码无效或已过期",
            )

        await redis_client.delete(key)

        identity_result = await db.execute(
            select(AuthIdentity).where(
                AuthIdentity.provider == "email",
                AuthIdentity.subject == normalized_email,
            )
        )
        identity = identity_result.scalar_one_or_none()

        if identity is None:
            legacy_result = await db.execute(select(User).where(User.email == normalized_email))
            user = legacy_result.scalar_one_or_none()
            if user is None:
                user = User(
                    email=normalized_email,
                    hashed_password=None,
                    display_name=normalized_email.split("@", maxsplit=1)[0],
                    uid=await _generate_uid(db),
                )
                db.add(user)
                await db.flush()

            identity = AuthIdentity(
                user_id=user.id,
                provider="email",
                subject=normalized_email,
            )
            db.add(identity)
        else:
            user_result = await db.execute(select(User).where(User.id == identity.user_id))
            user = user_result.scalar_one()

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="用户账号已停用",
            )

        logger.info("user_logged_in_by_email", user_id=str(user.id))
        return cls._issue_auth_data(db, user, settings)

    @classmethod
    async def refresh(
        cls,
        db: AsyncSession,
        raw_refresh_token: str,
    ) -> TokenData:
        """Rotate a refresh token: revoke the old one, issue a new pair."""
        settings = get_settings()

        # Decode without DB hit first (fast-fail for malformed tokens)
        try:
            payload = decode_token(raw_refresh_token, settings)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            ) from None

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not a refresh token",
            )

        token_hash = hash_token(raw_refresh_token)

        # Row-level lock to prevent concurrent refresh races
        result = await db.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update()
        )
        stored = result.scalar_one_or_none()

        if stored is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not recognised",
            )

        if stored.revoked:
            # Potential token theft — revoke all tokens for this user
            await cls._revoke_all_user_tokens(db, stored.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        if stored.is_expired:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        # Revoke old token (rotation)
        stored.revoked = True

        user_id = payload["sub"]

        # Issue new pair
        new_access = create_access_token(user_id, settings)
        new_refresh = create_refresh_token(user_id, settings)

        cls._store_refresh_token(db, user_id, new_refresh, settings)

        logger.info("token_refreshed", user_id=user_id)

        return TokenData(
            access_token=new_access,
            refresh_token=new_refresh,
        )

    @classmethod
    async def logout(
        cls,
        db: AsyncSession,
        raw_refresh_token: str,
    ) -> MessageData:
        """Revoke a refresh token so it can no longer be used."""
        token_hash = hash_token(raw_refresh_token)

        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored = result.scalar_one_or_none()

        if stored is not None:
            stored.revoked = True
            logger.info("token_revoked", user_id=str(stored.user_id))

        # Idempotent — always return success even if token not found
        return MessageData(message="Logged out successfully")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _issue_auth_data(cls, db: AsyncSession, user: User, settings: Settings) -> AuthData:
        access_token = create_access_token(str(user.id), settings)
        refresh_token = create_refresh_token(str(user.id), settings)
        cls._store_refresh_token(db, user.id, refresh_token, settings)
        return AuthData(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )

    @staticmethod
    def _store_refresh_token(
        db: AsyncSession,
        user_id: str,
        raw_token: str,
        settings: Settings,
    ) -> None:
        """Hash and persist a refresh token."""
        payload = decode_token(raw_token, settings)
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        rt = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=exp,
        )
        db.add(rt)

    @staticmethod
    async def _revoke_all_user_tokens(
        db: AsyncSession,
        user_id: str,
    ) -> None:
        """Revoke every refresh token for a user (anti-theft measure)."""
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked == False,  # noqa: E712
            )
        )
        tokens = result.scalars().all()
        for t in tokens:
            t.revoked = True
        if tokens:
            logger.warning(
                "all_tokens_revoked",
                user_id=str(user_id),
                count=len(tokens),
            )


async def _generate_uid(db: AsyncSession) -> str:
    """Assign the next sequential UID based on registration order."""
    from sqlalchemy import cast, Integer
    result = await db.execute(
        select(cast(User.uid, Integer))
        .where(User.uid.isnot(None))
        .order_by(cast(User.uid, Integer).desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    next_uid = (last + 1) if last else 1
    return str(next_uid)


def _normalize_email(email: str) -> str:
    """Use one canonical representation for identity lookups and rate limits."""
    return email.strip().lower()


def _email_code_key(email: str) -> str:
    return f"auth:email:code:{hashlib.sha256(email.encode()).hexdigest()}"


def _email_code_cooldown_key(email: str) -> str:
    return f"auth:email:cooldown:{hashlib.sha256(email.encode()).hexdigest()}"


def _code_digest(email: str, code: str, settings: Settings) -> str:
    payload = f"{email}:{code}".encode()
    return hmac.new(settings.jwt_secret_key.encode(), payload, hashlib.sha256).hexdigest()
