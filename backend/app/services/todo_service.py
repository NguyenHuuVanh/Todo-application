import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.models.todo import Todo
from app.schemas.todo import TodoCreate


async def create_todo(
    db: AsyncSession, todo_data: TodoCreate, user_id: uuid.UUID
) -> Todo:
    todo = Todo(
        title=todo_data.title,
        description=todo_data.description,
        user_id=user_id,
    )
    db.add(todo)
    await db.flush()
    await db.refresh(todo)
    return todo


async def get_todos(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
    tag_id: uuid.UUID | None = None,
    keyword: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> tuple[list[Todo], int]:
    """Get all todos with pagination for a specific user."""
    filters = [Todo.user_id == user_id]
    if status == "completed":
        filters.append(Todo.completed.is_(True))
    elif status == "active":
        filters.append(Todo.completed.is_(False))
    if keyword:
        keyword_pattern = f"%{keyword}%"
        filters.append(
            or_(
                Todo.title.ilike(keyword_pattern),
                Todo.description.ilike(keyword_pattern),
            )
        )
    if date_from:
        filters.append(Todo.created_at >= date_from)
    if date_to:
        filters.append(Todo.created_at <= date_to)

    query = select(Todo).options(selectinload(Todo.user), selectinload(Todo.tags))
    count_query = select(func.count()).select_from(Todo)

    if tag_id:
        query = query.join(Todo.tags)
        count_query = count_query.join(Todo.tags)
        filters.append(Tag.id == tag_id)

    query = (
        query.where(and_(*filters))
        .order_by(Todo.created_at.desc(), Todo.id.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    todos = list(result.scalars().all())

    count_query = count_query.where(and_(*filters))
    total = await db.execute(count_query)

    return todos, total.scalar_one()


async def get_todo_by_id(db: AsyncSession, todo_id: uuid.UUID) -> Todo | None:
    result = await db.execute(
        select(Todo)
        .options(selectinload(Todo.user), selectinload(Todo.tags))
        .where(Todo.id == todo_id)
    )
    return result.scalar_one_or_none()


async def update_todo(db: AsyncSession, todo: Todo, update_data: dict) -> Todo:
    for key, value in update_data.items():
        setattr(todo, key, value)
    await db.flush()
    return await get_todo_by_id(db, todo.id) or todo


async def delete_todo(db: AsyncSession, todo: Todo) -> None:
    await db.delete(todo)
    await db.flush()


async def attach_tag_to_todo(db: AsyncSession, todo: Todo, tag: Tag) -> Todo:
    if tag not in todo.tags:
        todo.tags.append(tag)
    await db.flush()
    await db.refresh(todo)
    return await get_todo_by_id(db, todo.id) or todo


async def detach_tag_from_todo(db: AsyncSession, todo: Todo, tag: Tag) -> Todo:
    todo.tags = [existing for existing in todo.tags if existing.id != tag.id]
    await db.flush()
    await db.refresh(todo)
    return await get_todo_by_id(db, todo.id) or todo


async def bulk_update_todo_status(
    db: AsyncSession,
    user_id: uuid.UUID,
    todo_ids: list[uuid.UUID],
    completed: bool,
) -> int:
    unique_ids = list(dict.fromkeys(todo_ids))
    owned_count_result = await db.execute(
        select(func.count())
        .select_from(Todo)
        .where(Todo.user_id == user_id, Todo.id.in_(unique_ids))
    )
    owned_count = owned_count_result.scalar_one()
    if owned_count != len(unique_ids):
        return 0

    result = await db.execute(
        update(Todo)
        .where(Todo.user_id == user_id, Todo.id.in_(unique_ids))
        .values(completed=completed, updated_at=datetime.now(timezone.utc))
    )
    await db.flush()
    return result.rowcount or 0
