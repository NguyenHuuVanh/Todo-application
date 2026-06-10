import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_redis
from app.core.redis import RedisClient
from app.db.session import get_db
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.services.todo_cache import invalidate_user_todo_cache
from app.services.tag_service import (
    create_tag,
    delete_tag,
    get_tags,
    get_user_tag_by_id,
    update_tag,
)

router = APIRouter()


async def _tag_conflict(db: AsyncSession) -> None:
    await db.rollback()
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Tag name already exists",
    )


@router.get("", response_model=list[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_tags(db, current_user.id)


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_new_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_tag(db, tag_data, current_user.id)
    except IntegrityError:
        await _tag_conflict(db)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_existing_tag(
    tag_id: uuid.UUID,
    tag_data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    tag = await get_user_tag_by_id(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    try:
        updated_tag = await update_tag(db, tag, tag_data.model_dump(exclude_unset=True))
    except IntegrityError:
        await _tag_conflict(db)

    await invalidate_user_todo_cache(redis, current_user.id)
    return updated_tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_tag(
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    tag = await get_user_tag_by_id(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    await delete_tag(db, tag)
    await invalidate_user_todo_cache(redis, current_user.id)
    return None
