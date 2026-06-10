# Todo Tags, Filtering & Bulk Actions — Frontend

**Ngày cập nhật:** 2026-06-11  
**Phạm vi:** React 19, Vite, TanStack Query, react-hook-form, zod

---

## Kết luận kiểm tra

Các yêu cầu frontend trong phần mở rộng **Todo Tags, Filtering & Bulk Actions** đã được đối chiếu lại với code hiện tại và đều đã được triển khai.

| Nhóm yêu cầu | Trạng thái | Nơi triển khai / kiểm chứng |
|---|---|---|
| Todo list filter bar có `keyword` | Đạt | `src/features/todos/components/TodoFilters.tsx` |
| Todo list filter bar có `status` | Đạt | `TodoFilters.tsx`, gửi `status` trong `useTodos()` |
| Todo list filter bar có `tag` | Đạt | `TodoFilters.tsx`, lấy dữ liệu tag từ `useTags()` |
| Todo list filter bar có date range | Đạt | `dateFrom`, `dateTo` trong `TodoFilters.tsx` |
| Todo list filter bar có clear filters | Đạt | Nút clear gọi `reset()` và `onChange({})` |
| Todo item UI hiển thị tag đã gắn | Đạt | `src/features/todos/components/TodoItem.tsx` |
| Tag chip hiển thị màu tag | Đạt | `TodoItem.tsx`, style theo `tag.color` |
| Tag management UI list tag | Đạt | `src/features/todos/components/TagManager.tsx` |
| Tag management UI create tag | Đạt | `TagManager.tsx`, `useCreateTag()` |
| Tag management UI rename tag | Đạt | `TagManager.tsx`, `useUpdateTag()` |
| Tag management UI delete tag | Đạt | `TagManager.tsx`, `useDeleteTag()` |
| Bulk actions chọn nhiều todo | Đạt | `TodoPage.tsx`, `TodoList.tsx`, `TodoItem.tsx`; chọn bằng icon `CirclePlus/CircleMinus` |
| Bulk actions đánh dấu completed | Đạt | `useBulkUpdateTodoStatus()` với `completed: true` |
| Bulk actions đánh dấu active | Đạt | `useBulkUpdateTodoStatus()` với `completed: false` |
| Dùng `@tanstack/react-query` cho data fetching và mutations | Đạt | `src/features/todos/api/todos.ts` |
| Query keys bao gồm toàn bộ filter parameters | Đạt | `todosQueryKey(page, size, filters)` gồm `status`, `tagId`, `keyword`, `dateFrom`, `dateTo` |
| Invalidate query cache đúng sau mutation | Đạt | Todo/tag mutations invalidate `["todos"]` và/hoặc `["tags"]` |
| Dùng `react-hook-form` và `zod` validation khớp backend | Đạt | `TodoFilters.tsx`, `TagManager.tsx`, `src/features/todos/schemas/todo.ts` |
| Clear user-scoped cached data khi logout | Đạt | `src/features/auth/hooks/useAuth.ts` gọi `queryClient.clear()` |
| Clear cached data khi token hết hạn hoặc API trả 401 | Đạt | `src/lib/api.ts` interceptor gọi `queryClient.clear()` |

---

## Tính năng đã triển khai

### 1. Todo Filter Bar

Màn todo đã có filter bar phía trên danh sách.

**Filters:**
- `keyword`: tìm kiếm theo từ khóa
- `status`: `All`, `Active`, `Completed`
- `tag`: lọc theo tag
- `date range`: `From` và `To`
- Clear filters

**Behavior:**
- Submit filter sẽ gọi lại `useTodos(page, pageSize, filters)`.
- Khi đổi filter, page được reset về `1`.
- Clear filters xóa toàn bộ filter hiện tại.
- Query params gửi lên backend:
  - `page`
  - `page_size`
  - `status`
  - `tag_id`
  - `keyword`
  - `date_from`
  - `date_to`

**Files chính:**
- `src/features/todos/components/TodoFilters.tsx`
- `src/features/todos/components/TodoPage.tsx`
- `src/features/todos/api/todos.ts`

---

### 2. Pagination UI

Todo page đã có điều khiển phân trang.

**Controls:**
- `Previous`
- `Next`
- Hiển thị `Page X of Y`
- Hiển thị `Showing N of total todos`

**Behavior:**
- Page size hiện tại: `10`
- Khi chuyển trang, selected todos được clear để tránh bulk action nhầm item.

**Files chính:**
- `src/features/todos/components/TodoPage.tsx`
- `src/features/todos/api/todos.ts`

---

### 3. Todo Tags UI

Todo item đã hiển thị tag được gắn.

**Trên mỗi todo item:**
- Hiển thị tag chip theo màu tag.
- Dropdown `Add tag` để gắn tag còn chưa được gắn vào todo.
- Nút x trên tag chip để gỡ tag khỏi todo.

**Rules phía UI:**
- Chỉ hiển thị tag chưa được gắn trong dropdown attach.
- Sau attach/detach, todo query cache được invalidate.

**Files chính:**
- `src/features/todos/components/TodoItem.tsx`
- `src/features/todos/components/TodoList.tsx`
- `src/features/todos/api/todos.ts`

---

### 4. Tag Management UI

Đã thêm panel quản lý tag trong màn todo.

**Actions:**
- List tag
- Create tag
- Rename tag
- Update color
- Delete tag

**Validation:**
- Dùng `react-hook-form` + `zod`
- `name`: bắt buộc, tối đa 50 ký tự
- `color`: tối đa 20 ký tự

**Files chính:**
- `src/features/todos/components/TagManager.tsx`
- `src/features/todos/schemas/todo.ts`
- `src/features/todos/api/todos.ts`

---

### 5. Bulk Actions

Todo list đã hỗ trợ chọn nhiều todo và cập nhật trạng thái hàng loạt.

**Actions:**
- Chọn từng todo bằng icon `CirclePlus` / `CircleMinus` để tránh nhầm với checkbox completed.
- Mark selected todos as `Completed`.
- Mark selected todos as `Active`.

**Behavior:**
- Bulk action bar chỉ hiện khi có ít nhất một todo được chọn.
- Sau bulk update thành công:
  - Invalidate todo queries.
  - Clear selected todo ids.

**Files chính:**
- `src/features/todos/components/TodoPage.tsx`
- `src/features/todos/components/TodoList.tsx`
- `src/features/todos/components/TodoItem.tsx`
- `src/features/todos/api/todos.ts`

---

### 6. React Query Hooks

Đã mở rộng hooks trong `src/features/todos/api/todos.ts`.

**Todo hooks:**
- `useTodos(page, size, filters)`
- `useCreateTodo`
- `useUpdateTodo`
- `useDeleteTodo`
- `useToggleTodo`
- `useAttachTodoTag`
- `useDetachTodoTag`
- `useBulkUpdateTodoStatus`

**Tag hooks:**
- `useTags`
- `useCreateTag`
- `useUpdateTag`
- `useDeleteTag`

**Query keys:**
- Todo query key bao gồm đầy đủ:
  - `page`
  - `size`
  - `status`
  - `tagId`
  - `keyword`
  - `dateFrom`
  - `dateTo`
- Tag query key: `["tags"]`

**Cache invalidation:**
- Todo mutations invalidate `["todos"]`.
- Tag mutations invalidate `["tags"]` và các todo queries khi cần.
- Logout/401 vẫn clear user-scoped cached data.

---

## Tests

Đã thêm/cập nhật frontend tests:

- `src/test/logout-cache-clear.test.tsx`
- `src/test/todo-tags-filters-bulk.test.tsx`
- `src/test/bug-02-04-todos-mutations.test.tsx`
- `src/test/bug-01-03-todo-list-keys.test.tsx`
- `src/test/bug-06-use-toggle-todo.test.tsx`
- `src/test/bug-10-api-401-cache.test.ts`

Các case chính:
- Validation form tag.
- Todo filter query key bao gồm toàn bộ filter parameters.
- Bulk action success invalidates todo query.
- Bulk action error state.
- Clear user-scoped cached data khi logout.
- Clear cached data khi API trả 401.
- Todo type mới có `tags`.
- Query request dùng `page_size`.

Kết quả gần nhất:

```text
8 test files passed
19 tests passed
```

Build và lint:

```text
npm run lint: pass
npm run build: pass
```
