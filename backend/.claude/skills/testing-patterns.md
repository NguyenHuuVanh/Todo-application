# Testing Patterns — pytest-asyncio + httpx

## Setup

```ini
# pytest.ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = session
```

## Fixtures chuẩn (conftest.py pattern)

```python
@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

async def get_auth_token(client: AsyncClient, email: str) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123"},
    )
    return res.json()["access_token"]
```

## Test patterns quan trọng

### Security test — ownership isolation
```python
async def test_cannot_read_other_user_todo(client):
    token_a = await get_auth_token(client, "a@test.com")
    token_b = await get_auth_token(client, "b@test.com")

    res = await client.post("/api/v1/todos",
        json={"title": "B todo"},
        headers={"Authorization": f"Bearer {token_b}"})
    todo_id = res.json()["id"]

    res = await client.get(f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token_a}"})
    assert res.status_code == 403
```

### Security test — expired token
```python
async def test_expired_token_rejected(client):
    # Token với exp đã qua
    expired_token = create_access_token(
        data={"sub": str(uuid.uuid4())},
        expires_delta=timedelta(seconds=-1)
    )
    res = await client.get("/api/v1/todos",
        headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
```

### Cache isolation test
```python
async def test_cache_scoped_per_user(client):
    token_a = await get_auth_token(client, "cache_a@test.com")
    token_b = await get_auth_token(client, "cache_b@test.com")

    # A tạo todo
    await client.post("/api/v1/todos",
        json={"title": "A only"},
        headers={"Authorization": f"Bearer {token_a}"})

    # B không thấy todo của A
    res = await client.get("/api/v1/todos",
        headers={"Authorization": f"Bearer {token_b}"})
    titles = [t["title"] for t in res.json()["items"]]
    assert "A only" not in titles
```

## Naming convention
- `test_<action>_<expected_result>` — ví dụ: `test_delete_todo_returns_204`
- `test_cannot_<forbidden_action>` — ví dụ: `test_cannot_read_other_user_todo`
- `test_<feature>_requires_auth` — ví dụ: `test_list_todos_requires_auth`
