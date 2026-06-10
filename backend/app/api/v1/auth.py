import uuid
from time import time

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_redis
from app.core.redis import RedisClient
from app.core.security import create_access_token, create_refresh_token, verify_password, verify_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth_service import create_user, get_user_by_email, get_user_by_id

router = APIRouter()
security_scheme = HTTPBearer()


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


def _refresh_token_ttl_seconds() -> int:
    from app.core.config import settings

    return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


async def _blacklist_refresh_token(redis: RedisClient, refresh_token: str | None) -> None:
    if not refresh_token:
        return

    payload = verify_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        return

    jti = payload.get("jti")
    if isinstance(jti, str):
        await redis.set(f"blacklist:refresh:{jti}", "1", ex=_refresh_token_ttl_seconds())


async def _refresh_token_was_issued_before_logout(
    redis: RedisClient, user_id: uuid.UUID, issued_at: object
) -> bool:
    logout_after = await redis.get(f"logout_after:{user_id}")
    if logout_after is None:
        return False

    try:
        return float(issued_at) <= float(logout_after)
    except (TypeError, ValueError):
        return True


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        user = await create_user(db, user_data)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return tokens."""
    user = await get_user_by_email(db, user_data.email)

    # BUG-11: same error for wrong email and wrong password (prevent email enumeration)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Refresh access token using refresh token."""
    payload = verify_token(request.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")
    if isinstance(jti, str) and await redis.exists(f"blacklist:refresh:{jti}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    try:
        user_uuid = uuid.UUID(user_id)
    except (TypeError, ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if await _refresh_token_was_issued_before_logout(redis, user_uuid, payload.get("iat")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    user = await get_user_by_id(db, user_uuid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(data={"sub": user_id})
    refresh_token = create_refresh_token(data={"sub": user_id})
    if isinstance(jti, str):
        await redis.set(f"blacklist:refresh:{jti}", "1", ex=_refresh_token_ttl_seconds())

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/logout")
async def logout(
    request: LogoutRequest | None = None,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    current_user: User = Depends(get_current_user),
    redis: RedisClient = Depends(get_redis),
):
    from app.core.config import settings

    token = credentials.credentials
    payload = verify_token(token)
    if payload:
        jti = payload.get("jti") or token[-16:]
        ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        await redis.set(f"blacklist:{jti}", "1", ex=ttl)

    await redis.set(
        f"logout_after:{current_user.id}",
        str(time()),
        ex=_refresh_token_ttl_seconds(),
    )
    await _blacklist_refresh_token(redis, request.refresh_token if request else None)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return current_user
