# Todo Tags, Filtering & Bulk Actions — Backend

**Ngày cập nhật:** 2026-06-11  
**Phạm vi:** Backend FastAPI, SQLAlchemy, Alembic, Redis cache

---

## Kết luận kiểm tra

Các yêu cầu backend trong phần mở rộng **Todo Tags, Filtering & Bulk Actions** đã được đối chiếu lại với code hiện tại và đều đã được triển khai.

> Lưu ý: README mô tả endpoint dạng `/tags`, `/todos`; trong ứng dụng thực tế các route được mount dưới prefix version nên path đầy đủ là `/api/v1/tags` và `/api/v1/todos`.

| Nhóm yêu cầu | Trạng thái | Nơi triển khai / kiểm chứng |
|---|---|---|
| Bảng `tags` có `id`, `user_id`, `name`, `color`, `created_at`, `updated_at` | Đạt | `app/models/tag.py`, migration `c7d9e2f4a6b1_add_tags_filters_bulk_actions.py` |
| `created_at`, `updated_at` dùng timezone-aware timestamp | Đạt | `DateTime(timezone=True)` trong model và migration |
| Bảng `todo_tags` có `todo_id`, `tag_id`, primary key `(todo_id, tag_id)` | Đạt | `app/models/tag.py`, migration |
| `tags.user_id` foreign key tới `users.id`, không null | Đạt | `Tag.user_id`, migration `tags.user_id` |
| `todo_tags.todo_id` và `todo_tags.tag_id` foreign key, không null | Đạt | Association table `todo_tags`, migration |
| Tên tag unique theo từng user, không phân biệt hoa thường | Đạt | Unique index `uq_tags_user_lower_name` trên `user_id, lower(name)` |
| Index `tags(user_id)` | Đạt | `ix_tags_user_id` |
| Index `todo_tags(tag_id)` | Đạt | `ix_todo_tags_tag_id` |
| Index `todo_tags(todo_id)` | Đạt | `ix_todo_tags_todo_id` |
| Index `todos(user_id, completed, created_at)` | Đạt | `ix_todos_user_completed_created` |
| `GET /tags` | Đạt | `GET /api/v1/tags` trong `app/api/v1/tags.py` |
| `POST /tags` | Đạt | `POST /api/v1/tags` |
| `PATCH /tags/{tag_id}` | Đạt | `PATCH /api/v1/tags/{tag_id}` |
| `DELETE /tags/{tag_id}` | Đạt | `DELETE /api/v1/tags/{tag_id}` |
| `GET /todos?status=&tag_id=&keyword=&date_from=&date_to=&page=&page_size=` | Đạt | `GET /api/v1/todos` trong `app/api/v1/todos.py` |
| `POST /todos/{todo_id}/tags` | Đạt | `POST /api/v1/todos/{todo_id}/tags` |
| `DELETE /todos/{todo_id}/tags/{tag_id}` | Đạt | `DELETE /api/v1/todos/{todo_id}/tags/{tag_id}` |
| `PATCH /todos/bulk-status` | Đạt | `PATCH /api/v1/todos/bulk-status` |
| User chỉ thao tác với tag của chính họ | Đạt | `get_user_tag_by_id(...)` trong tag API/service |
| User chỉ thao tác với todo của chính họ | Đạt | Ownership checks trong `app/api/v1/todos.py` |
| Chỉ gắn tag của chính user vào todo của chính user | Đạt | `attach_tag(...)` kiểm tra cả todo owner và tag owner |
| Bulk update chạy trong database transaction | Đạt | `get_db()` commit/rollback theo request, bulk dùng một SQL `UPDATE` sau ownership check |
| Todo pagination sắp xếp `created_at DESC, id DESC` | Đạt | `get_todos()` trong `app/services/todo_service.py` |
| Date range filter không lệch ngày do UTC | Đạt | `date_from/date_to` được hiểu theo `APP_TIMEZONE=Asia/Ho_Chi_Minh`, sau đó convert sang UTC để query DB |
| Redis cache scoped theo user và query/filter parameters | Đạt | `todo_list_cache_key()` trong `app/services/todo_cache.py` |
| Invalidate cache khi create/update/delete todo | Đạt | `create_new_todo`, `update_existing_todo`, `delete_existing_todo` |
| Invalidate cache khi thay đổi mapping tag | Đạt | `attach_tag`, `detach_tag` |
| Invalidate cache khi bulk update | Đạt | `bulk_update_status` |

---

## Tính năng đã triển khai

### 1. Todo Tags

Đã thêm hệ thống tag theo từng user.

**Database:**
- Bảng `tags`
  - `id`: UUID primary key
  - `user_id`: UUID foreign key tới `users(id)`
  - `name`: `VARCHAR(50)`, bắt buộc
  - `color`: `VARCHAR(20)`, tùy chọn
  - `created_at`, `updated_at`: timezone-aware timestamp
- Bảng `todo_tags`
  - `todo_id`: UUID foreign key tới `todos(id)`
  - `tag_id`: UUID foreign key tới `tags(id)`
  - Primary key: `(todo_id, tag_id)`

**Constraints và indexes:**
- Unique tag name theo từng user, không phân biệt hoa thường: `uq_tags_user_lower_name`
- Indexes:
  - `ix_tags_user_id`
  - `ix_todo_tags_tag_id`
  - `ix_todo_tags_todo_id`
  - `ix_todos_user_completed_created`

**Files chính:**
- `app/models/tag.py`
- `app/schemas/tag.py`
- `app/services/tag_service.py`
- `alembic/versions/c7d9e2f4a6b1_add_tags_filters_bulk_actions.py`

---

### 2. Tag API

Đã thêm router `/api/v1/tags`.

| Method | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/api/v1/tags` | Lấy danh sách tag của user hiện tại |
| `POST` | `/api/v1/tags` | Tạo tag mới |
| `PATCH` | `/api/v1/tags/{tag_id}` | Đổi tên hoặc cập nhật màu tag |
| `DELETE` | `/api/v1/tags/{tag_id}` | Xóa tag và mapping todo-tag liên quan |

**Rules đã áp dụng:**
- User chỉ thấy và sửa tag của chính mình.
- Tên tag unique theo từng user, không phân biệt hoa thường.
- Update/delete tag sẽ invalidate cache todo list của user.

**Files chính:**
- `app/api/v1/tags.py`
- `app/main.py`

---

### 3. Todo Filtering & Pagination

Endpoint `GET /api/v1/todos` đã hỗ trợ filter và pagination mở rộng.

**Query params:**
- `status`: `active` hoặc `completed`
- `tag_id`: UUID tag
- `keyword`: tìm theo title hoặc description
- `date_from`: ngày bắt đầu, format `YYYY-MM-DD`
- `date_to`: ngày kết thúc, format `YYYY-MM-DD`
- `page`: số trang, bắt đầu từ `1`
- `page_size`: kích thước trang, tối đa `100`
- `size`: vẫn được giữ để tương thích ngược

**Timezone cho date range:**
- Database vẫn lưu `created_at` / `updated_at` theo UTC.
- API response của todo convert timestamp sang timezone ứng dụng.
- Timezone mặc định: `Asia/Ho_Chi_Minh`, cấu hình bằng biến môi trường `APP_TIMEZONE`.
- Khi client gửi `date_from=YYYY-MM-DD` hoặc `date_to=YYYY-MM-DD`, backend hiểu đó là ngày local theo `APP_TIMEZONE`, rồi convert boundary sang UTC để query DB.
- Ví dụ todo lưu DB là `2026-06-10T18:43:50Z` sẽ được hiểu là `2026-06-11T01:43:50+07:00`, nên vẫn match filter `date_from=2026-06-11&date_to=2026-06-11`.

**Ordering:**

```sql
created_at DESC, id DESC
```

**Rules đã áp dụng:**
- User chỉ lấy todo của chính mình.
- Filter theo tag chỉ áp dụng tag thuộc user hiện tại.
- `date_from > date_to` trả lỗi validation.
- Todo response có thêm field `tags`.

**Files chính:**
- `app/api/v1/todos.py`
- `app/services/todo_service.py`
- `app/schemas/todo.py`

---

### 4. Attach / Detach Tag Vào Todo

| Method | Endpoint | Chức năng |
|---|---|---|
| `POST` | `/api/v1/todos/{todo_id}/tags` | Gắn tag vào todo |
| `DELETE` | `/api/v1/todos/{todo_id}/tags/{tag_id}` | Gỡ tag khỏi todo |

**Payload attach:**

```json
{
  "tag_id": "uuid"
}
```

**Rules đã áp dụng:**
- User chỉ gắn tag vào todo của chính mình.
- User chỉ được dùng tag của chính mình.
- Thay đổi mapping todo-tag sẽ invalidate cache todo list của user.

---

### 5. Bulk Status Update

Đã thêm endpoint cập nhật trạng thái nhiều todo cùng lúc.

| Method | Endpoint | Chức năng |
|---|---|---|
| `PATCH` | `/api/v1/todos/bulk-status` | Đánh dấu nhiều todo là completed hoặc active |

**Payload:**

```json
{
  "todo_ids": ["uuid-1", "uuid-2"],
  "completed": true
}
```

**Response:**

```json
{
  "updated_count": 2
}
```

**Rules đã áp dụng:**
- Chặn bulk update nếu payload chứa todo không thuộc user hiện tại.
- Bulk update chạy trong session transaction của request.
- Bulk update invalidate cache todo list của user.

---

### 6. Redis Cache

Todo list cache đã được scope theo:
- `user_id`
- `page`
- `size/page_size`
- `status`
- `tag_id`
- `keyword`
- `date_from`
- `date_to`

**Cache invalidation khi:**
- Create todo
- Update todo
- Delete todo
- Attach/detach tag
- Rename/delete tag
- Bulk status update

**File chính:**
- `app/services/todo_cache.py`

---

## Tests

Đã thêm test backend cho phần mở rộng trong:

- `tests/test_tags_filters_bulk.py`

Các case chính:
- Tạo tag thành công.
- Không cho tạo tag trùng tên khi khác chữ hoa/thường.
- Cho phép tag trùng tên giữa hai user khác nhau.
- Chặn attach tag của user khác.
- Filter todo theo tag.
- Filter todo theo status, keyword, `page_size`.
- Kiểm tra ownership khi bulk update.
- Kiểm tra cache invalidation khi bulk update.
- Kiểm tra cache hit trả đúng response đã cache.
- Kiểm tra date range filter dùng timezone ứng dụng, không dùng raw UTC date.

Kết quả gần nhất:

```text
37 passed
```
