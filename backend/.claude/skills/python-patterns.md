# Python Patterns — FastAPI Async

## Quy tắc áp dụng cho dự án này

### Async everywhere
```python
# ✅ Luôn async cho route handlers
async def handler(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Todo))
    return result.scalars().all()
```

### SQLAlchemy 2.0
```python
# ✅ Mapped[T] + mapped_column
id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
email: Mapped[str] = mapped_column(String(255), unique=True, index=True)

# ✅ Query async
result = await db.execute(select(Todo).where(Todo.user_id == user_id))
todos = result.scalars().all()

# ✅ Ownership filter trong query (tốt hơn check sau)
result = await db.execute(
    select(Todo).where(Todo.id == todo_id, Todo.user_id == current_user.id)
)
todo = result.scalar_one_or_none()
if not todo:
    raise HTTPException(status_code=404, detail="Todo not found")
```

### Pydantic v2
```python
# ✅
schema.model_dump()
schema.model_dump_json()
response.model_dump(exclude_unset=True)

# ❌ Deprecated
schema.dict()
schema.json()
```

### Error handling
```python
# ✅ HTTPException với status code chuẩn
raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
```

### Redis cache pattern
```python
# ✅ Get-or-set
async def get_cached_or_fetch(redis, key, fetch_fn, ttl=300):
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    data = await fetch_fn()
    await redis.set(key, json.dumps(data), ex=ttl)
    return data

# ✅ Invalidate pattern
async def invalidate_user_cache(redis, user_id):
    keys = await redis.keys(f"todos:user:{user_id}:*")
    if keys:
        await redis.delete(*keys)
```
