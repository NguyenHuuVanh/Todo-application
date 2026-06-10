import json
import uuid
from datetime import datetime

from app.core.redis import RedisClient

CACHE_TTL = 300


def todo_list_cache_key(
    user_id: uuid.UUID,
    page: int,
    size: int,
    status_filter: str | None,
    tag_id: uuid.UUID | None,
    keyword: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> str:
    params = {
        "page": page,
        "size": size,
        "status": status_filter,
        "tag_id": str(tag_id) if tag_id else None,
        "keyword": keyword,
        "date_from": date_from.isoformat() if date_from else None,
        "date_to": date_to.isoformat() if date_to else None,
    }
    return f"todos:user:{user_id}:query:{json.dumps(params, sort_keys=True)}"


async def invalidate_user_todo_cache(redis: RedisClient, user_id: uuid.UUID) -> None:
    await redis.delete_pattern(f"todos:user:{user_id}:*")
