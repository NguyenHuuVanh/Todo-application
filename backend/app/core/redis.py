import redis.asyncio as aioredis

from app.core.config import settings


class RedisClient:
    def __init__(self):
        self._redis = None

    async def initialize(self):
        self._redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    async def close(self):
        if self._redis:
            await self._redis.close()

    @property
    def client(self):
        return self._redis

    async def get(self, key: str) -> str | None:
        try:
            return await self._redis.get(key)
        except Exception:
            return None

    async def set(self, key: str, value: str, ex: int | None = None):
        try:
            await self._redis.set(key, value, ex=ex)
        except Exception:
            pass

    async def delete(self, key: str):
        try:
            await self._redis.delete(key)
        except Exception:
            pass

    async def delete_pattern(self, pattern: str):
        try:
            keys = [key async for key in self._redis.scan_iter(match=pattern)]
            if keys:
                await self._redis.delete(*keys)
        except Exception:
            pass

    async def exists(self, key: str) -> bool:
        try:
            return await self._redis.exists(key)
        except Exception:
            return False


redis_client = RedisClient()
