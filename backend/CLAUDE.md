---
trigger: always_on
---

# CLAUDE.md — Todo Application Backend

> File này định nghĩa cách Claude AI hoạt động trong workspace này.
> Tuân theo hệ thống Antigravity Kit tại `.agent/`.

---

## CRITICAL: ĐỌC TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ

**Ưu tiên quy tắc:** `CLAUDE.md` (P0) > `.agent/rules/GEMINI.md` (P1) > Agent `.md` (P2) > `SKILL.md` (P3)

Trước khi implement bất kỳ thứ gì:

1. Đọc `.agent/rules/GEMINI.md` — quy tắc toàn cục
2. Chọn agent từ `.agent/agents/` phù hợp với task
3. Load skills từ frontmatter của agent đó
4. Thông báo agent đang dùng theo format bắt buộc

---

## 🗺️ AGENT ROUTING — DỰ ÁN NÀY

| Task | Agent | Skills cần load |
|------|-------|-----------------|
| API endpoint, business logic | `backend-specialist` | `api-patterns`, `python-patterns`, `nodejs-best-practices` |
| Security, JWT, auth, OWASP | `security-auditor` | `vulnerability-scanner`, `red-team-tactics` |
| Bug, lỗi runtime, root cause | `debugger` | `systematic-debugging` |
| Tests, pytest, coverage | `test-engineer` | `testing-patterns`, `webapp-testing` |
| Database schema, migration | `database-architect` | `database-design` |
| Lập kế hoạch, phân tích | `project-planner` | `brainstorming`, `plan-writing` |

**Format bắt buộc khi áp dụng agent:**
```
🤖 **Áp dụng kiến thức của `@[agent-name]`...**
```

---

## 📋 BỐI CẢNH ĐỀ BÀI (ASSESSMENT)

Đây là bài đánh giá năng lực developer. Codebase **cố ý chứa bugs** ở nhiều tầng.

**Mục tiêu**: Tìm và fix ít nhất **5 issues có ý nghĩa** (≥2 backend, ≥1 frontend).

**Thứ tự ưu tiên khi review:**

1. 🔴 Security vulnerabilities
2. 🔴 JWT validation bugs
3. 🟠 Missing authorization / ownership checks
4. 🟠 Cross-user data leakage
5. 🟡 Cache key isolation & invalidation
6. 🟡 Backend correctness & validation
7. 🟢 Frontend stale state / React Query
8. 🟢 Database constraints & performance
9. ⚪ Test reliability
10. ⚪ Minor conventions

**Quy tắc cứng:**
- ❌ Không rewrite toàn bộ app
- ❌ Không thêm dependency mới nếu không có lý do
- ❌ Không commit `.env`, secrets, credentials
- ✅ Mỗi fix phải có test nếu liên quan đến security

**Format bug report:**
```markdown
### [Tên issue]
**Location:** `path/to/file`, tên function
**Reason:** Tại sao đây là bug.
**Fix Proposal:** Giải thích ngắn gọn / snippet.
**Implemented:** Yes/No
**Tests:** Test nào được thêm/cập nhật.
```

---

## 🏗️ PROJECT STACK THỰC TẾ

| Layer | Technology |
|-------|-----------|
| Framework | Python 3.x + **FastAPI** (async) |
| Database | **PostgreSQL** via `asyncpg` + SQLAlchemy 2.0 |
| Cache | **Redis** (TTL 5 phút, key hiện tại: `"todos:list"`) |
| Auth | **JWT** — access (30min) + refresh (7 ngày), `python-jose` + `bcrypt` |
| ORM | SQLAlchemy 2.0 — `Mapped[T]` / `mapped_column` |
| Migrations | **Alembic** |
| Testing | `pytest-asyncio` (`asyncio_mode = auto`) + `httpx.AsyncClient` |
| Lint | `flake8`, `black` |
| Container | Docker + docker-compose (postgres:16, redis:7, backend:8000, frontend:3000) |

---

## 📁 CẤU TRÚC DỰ ÁN

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # get_current_user, get_redis
│   │   └── v1/
│   │       ├── auth.py          # POST /register /login /refresh /logout, GET /me
│   │       └── todos.py         # CRUD /api/v1/todos, Redis cache
│   ├── core/
│   │   ├── config.py            # pydantic-settings: DB, Redis, JWT config
│   │   ├── redis.py             # RedisClient (initialize/close trong lifespan)
│   │   └── security.py          # create_access_token, verify_token, bcrypt
│   ├── db/
│   │   ├── base.py / session.py # AsyncSession, engine
│   │   └── seed.py
│   ├── models/
│   │   ├── user.py              # User(id UUID, email, hashed_password, created_at)
│   │   └── todo.py              # Todo(id UUID, title, description, completed, user_id FK)
│   ├── schemas/                 # Pydantic v2 schemas
│   └── services/                # Business logic tách khỏi routes
├── alembic/versions/
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_todos.py
└── [Dockerfile, requirements.txt, pyproject.toml, pytest.ini, .flake8]
```

---

## ⚠️ KNOWN ISSUES (đã biết, cần kiểm tra)

| Issue | Location | Mô tả |
|-------|----------|-------|
| Cache không scope theo user | `todos.py:37` | `cache_key = "todos:list"` — không phân biệt user |
| `verify_exp: False` | `security.py:53` | Token hết hạn vẫn được accept |
| Thiếu ownership check | `todos.py` get/put/delete | Chưa verify `todo.user_id == current_user.id` |
| Email không unique constraint | `models/user.py` | Không có `unique=True` ở DB level |

---

## 🔧 LỆNH THƯỜNG DÙNG

```bash
# Chạy toàn bộ stack
docker-compose up

# Tests
pytest
pytest tests/test_todos.py -v

# Lint / Format
flake8 app/
black app/

# Migration
alembic revision --autogenerate -m "mô tả"
alembic upgrade head

# Agent validation
python .agent/scripts/checklist.py .
```

---

## 💡 CONVENTIONS BẮT BUỘC

```python
# ✅ Async everywhere
async def handler(..., db: AsyncSession = Depends(get_db)):
    ...

# ✅ Pydantic v2 — dùng model_dump(), KHÔNG dùng .dict()
response.model_dump_json()

# ✅ Error handling qua HTTPException
raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

# ✅ Ownership check (pattern cần áp dụng)
if todo.user_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

# ✅ Cache key có user scope (pattern cần áp dụng)
cache_key = f"todos:user:{current_user.id}:page:{page}:size:{size}"
```

---

## 📝 NGÔN NGỮ

- **Phản hồi cho user**: Tiếng Việt
- **Code, comments, commit messages**: English
