"""Authentication business logic.

All methods receive a database session as their first parameter and
return Pydantic schema instances — never ORM objects directly.
"""

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
        """Register a new user and return their tokens."""
        settings = get_settings()

        # Check for duplicate email
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        # Create user
        user = User(
            email=email,
            hashed_password=hash_password(password),
            display_name=display_name,
        )
        db.add(user)
        await db.flush()  # populate user.id

        logger.info("user_registered", user_id=str(user.id), email=email)

        # Issue tokens
        access_token = create_access_token(str(user.id), settings)
        refresh_token = create_refresh_token(str(user.id), settings)

        cls._store_refresh_token(db, user.id, refresh_token, settings)

        return AuthData(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )

    @classmethod
    async def login(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
    ) -> AuthData:
        """Authenticate a user and return their tokens."""
        settings = get_settings()

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        logger.info("user_logged_in", user_id=str(user.id))

        access_token = create_access_token(str(user.id), settings)
        refresh_token = create_refresh_token(str(user.id), settings)

        cls._store_refresh_token(db, user.id, refresh_token, settings)

        return AuthData(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )

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
