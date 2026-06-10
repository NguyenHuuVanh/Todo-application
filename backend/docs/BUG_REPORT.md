# Bug Report — Todo Application Backend

**Date:** 2026-06-10  
**Branch:** `assessment/bug-hunting`  
**Reviewed by:** Claude Opus 4.8 / Codex (AI-assisted review)  
**Git user:** NguyenHuuVanh  
**Disclosure:** Bugs were identified using AI-assisted code analysis and manually reviewed before documentation.  

---

## Tóm tắt

| ID | Severity | Status | Category |
|----|----------|--------|----------|
| BUG-01 | 🔴 Critical | Fixed | JWT / Auth |
| BUG-02 | 🔴 Critical | Fixed | Authorization |
| BUG-03 | 🟠 High | Fixed | Cache |
| BUG-04 | 🟡 Medium | Fixed | Cache |
| BUG-05 | 🟡 Medium | Fixed | Logic |
| BUG-06 | 🟡 Medium | Fixed | Auth |
| BUG-07 | 🟢 Low | Fixed | Performance |
| BUG-08 | 🟠 High | Fixed | Auth |
| BUG-09 | 🟠 High | Fixed | Security |
| BUG-10 | 🟡 Medium | Fixed | Auth |
| BUG-11 | 🟢 Low | Fixed | Resilience |
| BUG-12 | 🟠 High | Fixed | Auth |
| BUG-13 | 🟠 High | Fixed | Auth |
| BUG-14 | 🟠 High | Fixed | Database / Migration |
| BUG-15 | 🟡 Medium | Fixed | Auth / Database |
| BUG-16 | 🟡 Medium | Fixed | Auth / Error Handling |
| BUG-17 | 🟡 Medium | Fixed | Auth / Validation |
| BUG-18 | 🟡 Medium | Fixed | Backend API / Pagination |
| BUG-19 | 🟡 Medium | Fixed | Performance / Validation |
| BUG-20 | 🟢 Low | Fixed | Backend API / Validation |

---

## BUG-01 — JWT Token Expiry Not Verified

**Location:** `app/core/security.py`, function `verify_token`  
**Reason:** Nếu JWT decode tắt `verify_exp`, token đã hết hạn vẫn được chấp nhận. Attacker có thể dùng access token cũ sau khi token đáng lẽ đã expire.  
**Fix Proposal:**
```python
payload = jwt.decode(
    token,
    settings.JWT_SECRET,
    algorithms=[settings.JWT_ALGORITHM],
    options={"verify_exp": True},
)
```
**Implemented:** Yes  
**Tests:** `test_expired_token_rejected`

---

## BUG-02 — Missing Ownership Checks For Todo Read/Update/Delete

**Location:** `app/api/v1/todos.py`, functions `get_todo`, `update_existing_todo`, `delete_existing_todo`  
**Reason:** Nếu API không kiểm tra `todo.user_id == current_user.id`, User A có thể xem, sửa hoặc xóa todo của User B khi biết UUID. Đây là broken access control.  
**Fix Proposal:**
```python
todo = await get_todo_by_id(db, todo_id)
if not todo:
    raise HTTPException(status_code=404, detail="Todo not found")
if todo.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Forbidden")
```
**Implemented:** Yes  
**Tests:** `test_cannot_read_other_user_todo`, `test_cannot_update_other_user_todo`, `test_cannot_delete_other_user_todo`

---

## BUG-03 — Todo Cache Key Not Scoped By User And Pagination

**Location:** `app/api/v1/todos.py`, function `list_todos`  
**Reason:** Cache key global như `todos:list` có thể làm User B nhận lại cached todos của User A. Cache key cũng cần chứa pagination/query params để tránh trả sai page.  
**Fix Proposal:**
```python
def _cache_key(user_id: uuid.UUID, page: int, size: int) -> str:
    return f"todos:user:{user_id}:page:{page}:size:{size}"
```
**Implemented:** Yes  
**Tests:** `test_cache_isolated_per_user`

---

## BUG-04 — Todo Cache Not Invalidated After Mutations

**Location:** `app/api/v1/todos.py`, functions `create_new_todo`, `update_existing_todo`, `delete_existing_todo`; `app/core/redis.py`  
**Reason:** Sau khi tạo/sửa/xóa todo, cache list cũ cần bị xóa. Nếu không, user sẽ thấy stale data cho đến khi TTL hết hạn. Với nhiều page/size, invalidation cần xóa toàn bộ cache todo của user, không chỉ một key cố định.  
**Fix Proposal:**
```python
async def _invalidate_user_cache(redis: RedisClient, user_id: uuid.UUID) -> None:
    await redis.delete_pattern(f"todos:user:{user_id}:*")
```
**Implemented:** Yes  
**Tests:** `test_list_reflects_new_todo_immediately`, `test_list_reflects_deletion_immediately`

---

## BUG-05 — Update Logic Ignores Provided Data

**Location:** `app/api/v1/todos.py`, function `update_existing_todo`  
**Reason:** Nếu update handler gọi service với `{}` hoặc không dùng payload đã parse, các field user gửi lên sẽ không được persist.  
**Fix Proposal:**
```python
update_data = todo_data.model_dump(exclude_unset=True)
updated_todo = await update_todo(db, todo, update_data)
```
**Implemented:** Yes  
**Tests:** `test_update_todo_persists_changes`

---

## BUG-06 — Refresh Token Accepted On Protected Endpoints

**Location:** `app/api/deps.py`, function `get_current_user`  
**Reason:** Protected endpoints chỉ nên chấp nhận access token. Nếu không kiểm tra `payload["type"]`, refresh token có thể được dùng như access token.  
**Fix Proposal:**
```python
if payload.get("type") != "access":
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token type",
    )
```
**Implemented:** Yes  
**Tests:** `test_refresh_token_rejected_on_protected_endpoint`

---

## BUG-07 — N+1 Query In Todo List

**Location:** `app/services/todo_service.py`, function `get_todos`; `app/api/v1/todos.py`, function `list_todos`  
**Reason:** Nếu list endpoint query user/email riêng cho từng todo, số query tăng tuyến tính theo số todo. Nên eager-load relationship.  
**Fix Proposal:**
```python
query = (
    select(Todo)
    .options(selectinload(Todo.user))
    .where(Todo.user_id == user_id)
    .offset(skip)
    .limit(limit)
)
```
**Implemented:** Yes  
**Tests:** Not required; performance optimization.

---

## BUG-08 — Email Enumeration Via Login Errors

**Location:** `app/api/v1/auth.py`, function `login`  
**Reason:** Nếu login trả lỗi khác nhau cho email không tồn tại và sai password, attacker có thể dò email đã đăng ký.  
**Fix Proposal:**
```python
if not user or not verify_password(user_data.password, user.hashed_password):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )
```
**Implemented:** Yes  
**Tests:** `test_login_same_error_for_wrong_email_and_wrong_password`

---

## BUG-09 — CORS Allow All Origins

**Location:** `app/main.py`, CORS middleware configuration  
**Reason:** `allow_origins=["*"]` kết hợp với credentials là cấu hình không phù hợp và có thể mở rộng surface cho cross-origin abuse. Origin nên lấy từ config/env rõ ràng.  
**Fix Proposal:**
```python
allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")]
```
**Implemented:** Yes  
**Tests:** N/A — infrastructure config.

---

## BUG-10 — Password Has No Minimum Length

**Location:** `app/schemas/user.py`, class `UserCreate`  
**Reason:** Password quá ngắn hoặc rỗng làm giảm chất lượng bảo mật account. Register schema cần enforce độ dài tối thiểu.  
**Fix Proposal:**
```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
```
**Implemented:** Yes  
**Tests:** `test_register_rejects_short_password`

---

## BUG-11 — Redis Unavailable Can Break Todo Requests

**Location:** `app/core/redis.py`, methods `get`, `set`, `delete`, `exists`  
**Reason:** Redis cache là dependency phụ; nếu Redis down, API nên fallback sang DB thay vì crash request todo.  
**Fix Proposal:**
```python
async def get(self, key: str) -> str | None:
    try:
        return await self._redis.get(key)
    except Exception:
        return None
```
**Implemented:** Yes  
**Tests:** N/A — resilience improvement.

---

## BUG-12 — Logout Blacklist Is Written But Not Enforced

**Location:** `app/api/v1/auth.py`, function `logout`; `app/api/deps.py`, function `get_current_user`  
**Reason:** `logout()` ghi blacklist key vào Redis, nhưng protected endpoints không kiểm tra blacklist khi xác thực request. Access token đã logout vẫn có thể gọi `/auth/me` và `/api/v1/todos` cho đến khi hết hạn. Test logout cũ cũng chỉ kiểm tra status 200, không verify token bị reject sau logout.  
**Fix Proposal:**
```python
# Trong create_access_token()
to_encode.update({
    "exp": expire,
    "type": "access",
    "jti": str(uuid.uuid4()),
})

# Trong get_current_user(), sau verify_token(token)
jti = payload.get("jti") or token[-16:]
if await redis.exists(f"blacklist:{jti}"):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token has been revoked",
    )
```
`get_current_user()` cần nhận thêm `redis: RedisClient = Depends(get_redis)`.

**Implemented:** Yes  
**Tests:** `test_access_token_rejected_after_logout`

---

## BUG-13 — Refresh Tokens Are Not Revoked Or Rotated Safely

**Location:** `app/api/v1/auth.py`, function `refresh_token`, function `logout`; `app/core/security.py`, function `create_refresh_token`  
**Reason:** Refresh token vẫn còn hiệu lực sau logout và token cũ cũng không bị revoke khi refresh token mới được cấp. Nếu refresh token bị lộ, attacker có thể dùng lại để lấy access token mới.  
**Fix Proposal:**
```python
payload = verify_token(request.refresh_token)
jti = payload.get("jti")
if await redis.exists(f"blacklist:refresh:{jti}"):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token has been revoked",
    )

# Sau khi rotate refresh token, revoke jti cũ.
await redis.set(
    f"blacklist:refresh:{jti}",
    "1",
    ex=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
)
```
Nếu cần logout toàn bộ thiết bị, nên lưu refresh sessions theo user trong Redis hoặc DB.

**Implemented:** Yes  
**Tests:** `test_refresh_token_rejected_after_logout`, `test_old_refresh_token_rejected_after_rotation`

---

## BUG-14 — Alembic Migration Does Not Enforce Unique User Emails

**Location:** `alembic/versions/001_initial.py`, users table creation; `app/models/user.py`, `User.email`  
**Reason:** Model có `unique=True, index=True`, nhưng initial migration chỉ tạo cột email bình thường. Database tạo từ migrations có thể không enforce unique email, dẫn đến duplicate accounts và lỗi khi query bằng `scalar_one_or_none()`.  
**Fix Proposal:**
```python
op.create_unique_constraint("uq_users_email", "users", ["email"])
op.create_index("ix_users_email", "users", ["email"])
```
Với database đã có dữ liệu, cần xử lý duplicate email trước khi apply constraint.

**Implemented:** Yes  
**Tests:** Alembic migration `b4f3c2d1e9a0_add_email_and_todo_indexes.py`

---

## BUG-15 — Register Race Condition On Duplicate Email

**Location:** `app/api/v1/auth.py`, function `register`; `app/services/auth_service.py`, function `create_user`  
**Reason:** `register()` check email trước rồi mới insert. Hai request song song cùng email có thể cùng pass check. Khi DB unique constraint được thêm, request thua sẽ raise `IntegrityError` và có thể trả 500 nếu không catch.  
**Fix Proposal:**
```python
from sqlalchemy.exc import IntegrityError

try:
    user = await create_user(db, user_data)
except IntegrityError:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Email already registered",
    )
```
**Implemented:** Yes  
**Tests:** `IntegrityError` handling in `register`; duplicate requests return controlled client errors instead of 500.

---

## BUG-16 — Malformed JWT Subject Can Return 500

**Location:** `app/api/deps.py`, function `get_current_user`; `app/api/v1/auth.py`, function `refresh_token`  
**Reason:** Access token và refresh token đều parse `sub` bằng `uuid.UUID(...)`. Nếu `sub` thiếu hoặc sai kiểu, API có thể raise `TypeError`/`ValueError` và trả 500 thay vì 401.  
**Fix Proposal:**
```python
user_id = payload.get("sub")
if not isinstance(user_id, str):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token payload",
    )

try:
    user_uuid = uuid.UUID(user_id)
except (TypeError, ValueError, AttributeError):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid user ID in token",
    )
```
**Implemented:** Yes  
**Tests:** `test_access_token_with_non_string_sub_returns_401`, `test_refresh_rejects_invalid_uuid_sub`

---

## BUG-17 — Login Uses Register Schema

**Location:** `app/api/v1/auth.py`, function `login`; `app/schemas/user.py`, classes `UserCreate` and `UserLogin`  
**Reason:** Login endpoint đang dùng `UserCreate`, trong khi code đã có `UserLogin`. Vì `UserCreate` enforce password tối thiểu 8 ký tự, login với password ngắn trả `422` thay vì lỗi auth thống nhất `401`. Điều này tạo response inconsistency và đi ngược mục tiêu chống enumeration.  
**Fix Proposal:**
```python
from app.schemas.user import UserLogin

@router.post("/login", response_model=TokenResponse)
async def login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    ...
```
**Implemented:** Yes  
**Tests:** `test_login_short_password_returns_401_not_422`

---

## BUG-18 — Todo Pagination Has No Deterministic Ordering

**Location:** `app/services/todo_service.py`, function `get_todos`  
**Reason:** Query list todos dùng `offset()` và `limit()` nhưng không có `order_by()`. Pagination có thể không ổn định sau insert/delete, và Redis có thể cache page với thứ tự không nhất quán. README cũng yêu cầu order theo `created_at DESC, id DESC`.  
**Fix Proposal:**
```python
query = (
    select(Todo)
    .options(selectinload(Todo.user))
    .where(Todo.user_id == user_id)
    .order_by(Todo.created_at.desc(), Todo.id.desc())
    .offset(skip)
    .limit(limit)
)
```
Với dataset lớn, nên thêm index như `(user_id, created_at, id)`.

**Implemented:** Yes  
**Tests:** `test_todos_ordered_by_created_at_desc_then_id_desc`

---

## BUG-19 — Todo List Page Size Is Unbounded

**Location:** `app/api/v1/todos.py`, function `list_todos`, `size` query parameter  
**Reason:** API cho phép mọi giá trị `size > 0`. Client có thể request page cực lớn, gây query DB nặng, response lớn và Redis cache entry lớn.  
**Fix Proposal:**
```python
size: int = Query(20, ge=1, le=100)
```
Nếu frontend cần nhiều item, nên dùng pagination/filtering thay vì `size=10000`.

**Implemented:** Yes  
**Tests:** `test_todos_rejects_page_size_above_limit`

---

## BUG-20 — Todo Description Has No Maximum Length

**Location:** `app/schemas/todo.py`, classes `TodoCreate` and `TodoUpdate`  
**Reason:** `description` không có `max_length`, nên client có thể gửi payload rất lớn. Điều này làm request body, DB row, response JSON và Redis cache entry phình to không cần thiết.  
**Fix Proposal:**
```python
class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)

class TodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    completed: bool | None = None
```
**Implemented:** Yes  
**Tests:** `test_create_todo_rejects_too_long_description`, `test_update_todo_rejects_too_long_description`

---

## OWASP Mapping

| Bug | OWASP 2021 |
|-----|-----------|
| BUG-01 | A07 — Identification and Authentication Failures |
| BUG-02 | A01 — Broken Access Control |
| BUG-03 | A01 — Broken Access Control |
| BUG-04 | A04 — Insecure Design |
| BUG-05 | A04 — Insecure Design |
| BUG-06 | A07 — Identification and Authentication Failures |
| BUG-07 | N/A — Performance only |
| BUG-08 | A07 — Identification and Authentication Failures |
| BUG-09 | A05 — Security Misconfiguration |
| BUG-10 | A07 — Identification and Authentication Failures |
| BUG-11 | A04 — Insecure Design |
| BUG-12 | A07 — Identification and Authentication Failures |
| BUG-13 | A07 — Identification and Authentication Failures |
| BUG-14 | A04 — Insecure Design |
| BUG-15 | A04 — Insecure Design |
| BUG-16 | A07 — Identification and Authentication Failures |
| BUG-17 | A07 — Identification and Authentication Failures |
| BUG-18 | N/A — API correctness / performance |
| BUG-19 | A04 — Insecure Design |
| BUG-20 | A04 — Insecure Design |
