import json
import uuid
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_redis
from app.core.config import settings
from app.core.redis import RedisClient
from app.db.session import get_db
from app.models.user import User
from app.schemas.todo import (
    TodoBulkStatusResponse,
    TodoBulkStatusUpdate,
    TodoCreate,
    TodoListResponse,
    TodoResponse,
    TodoTagAttach,
    TodoUpdate,
)
from app.services.tag_service import get_user_tag_by_id
from app.services.todo_cache import (
    CACHE_TTL,
    invalidate_user_todo_cache,
    todo_list_cache_key,
)
from app.services.todo_service import (
    attach_tag_to_todo,
    bulk_update_todo_status,
    create_todo,
    delete_todo,
    detach_tag_from_todo,
    get_todo_by_id,
    get_todos,
    update_todo,
)

router = APIRouter()
APP_TIMEZONE = ZoneInfo(settings.APP_TIMEZONE)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _to_app_timezone(value: datetime) -> datetime:
    return _ensure_utc(value).astimezone(APP_TIMEZONE)


def _local_date_bound_to_utc(value: date, boundary: time) -> datetime:
    local_dt = datetime.combine(value, boundary, tzinfo=APP_TIMEZONE)
    return local_dt.astimezone(timezone.utc)


def _todo_response(todo) -> TodoResponse:
    user = todo.__dict__.get("user")
    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
        user_id=todo.user_id,
        created_at=_to_app_timezone(todo.created_at),
        updated_at=_to_app_timezone(todo.updated_at),
        user_email=user.email if user else None,
        tags=todo.__dict__.get("tags", []),
    )


@router.get("", response_model=TodoListResponse)
async def list_todos(
    status_filter: str | None = Query(None, alias="status", pattern="^(active|completed)$"),
    tag_id: uuid.UUID | None = None,
    keyword: str | None = Query(None, min_length=1, max_length=200),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    page_size: int | None = Query(None, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Get paginated list of todos."""
    if page_size is not None:
        size = page_size
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be before date_to",
        )
    date_from_dt = _local_date_bound_to_utc(date_from, time.min) if date_from else None
    date_to_dt = _local_date_bound_to_utc(date_to, time.max) if date_to else None

    skip = (page - 1) * size
    cache_key = todo_list_cache_key(
        current_user.id,
        page,
        size,
        status_filter,
        tag_id,
        keyword,
        date_from_dt,
        date_to_dt,
    )

    cached = await redis.get(cache_key)
    if cached:
        return TodoListResponse(**json.loads(cached))

    if tag_id and not await get_user_tag_by_id(db, tag_id, current_user.id):
        response = TodoListResponse(items=[], total=0, page=page, size=size)
        await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TTL)
        return response

    todos, total = await get_todos(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=size,
        status=status_filter,
        tag_id=tag_id,
        keyword=keyword,
        date_from=date_from_dt,
        date_to=date_to_dt,
    )

    items = [_todo_response(todo) for todo in todos]
    response = TodoListResponse(items=items, total=total, page=page, size=size)
    await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TTL)
    return response


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_new_todo(
    todo_data: TodoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Create a new todo item."""
    todo = await create_todo(db, todo_data, current_user.id)
    await invalidate_user_todo_cache(redis, current_user.id)
    return _todo_response(todo)


@router.patch("/bulk-status", response_model=TodoBulkStatusResponse)
async def bulk_update_status(
    payload: TodoBulkStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    updated_count = await bulk_update_todo_status(
        db,
        user_id=current_user.id,
        todo_ids=payload.todo_ids,
        completed=payload.completed,
    )
    if updated_count == 0:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    await invalidate_user_todo_cache(redis, current_user.id)
    return TodoBulkStatusResponse(updated_count=updated_count)


@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(
    todo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific todo by ID."""
    todo = await get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _todo_response(todo)


@router.put("/{todo_id}", response_model=TodoResponse)
async def update_existing_todo(
    todo_id: uuid.UUID,
    todo_data: TodoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Update a todo item."""
    todo = await get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    update_data = todo_data.model_dump(exclude_unset=True)
    updated_todo = await update_todo(db, todo, update_data)
    await invalidate_user_todo_cache(redis, current_user.id)
    return _todo_response(updated_todo)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_todo(
    todo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Delete a todo item."""
    todo = await get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    await delete_todo(db, todo)
    await invalidate_user_todo_cache(redis, current_user.id)
    return None


@router.post("/{todo_id}/tags", response_model=TodoResponse)
async def attach_tag(
    todo_id: uuid.UUID,
    payload: TodoTagAttach,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    todo = await get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    tag = await get_user_tag_by_id(db, payload.tag_id, current_user.id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    updated_todo = await attach_tag_to_todo(db, todo, tag)
    await invalidate_user_todo_cache(redis, current_user.id)
    return _todo_response(updated_todo)


@router.delete("/{todo_id}/tags/{tag_id}", response_model=TodoResponse)
async def detach_tag(
    todo_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    todo = await get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    tag = await get_user_tag_by_id(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    updated_todo = await detach_tag_from_todo(db, todo, tag)
    await invalidate_user_todo_cache(redis, current_user.id)
    return _todo_response(updated_todo)
