# Báo Cáo Lỗi — Frontend

**Branch:** `assessment/bug-hunting`  
**Ngày:** 2026-06-10  
**Phạm vi:** Chỉ Frontend (React 19 + Vite + TanStack Query)

---

## Tổng hợp

| # | Mức độ | File | Mô tả | Đã fix |
|---|--------|------|-------|--------|
| 01 | 🔴 Cao | `TodoList.tsx:53` | `<TodoForm>` thiếu `key` → form hiện data cũ khi đổi todo đang sửa | ✅ Đã fix |
| 02 | 🔴 Cao | `todos.ts:95` | `onError` bỏ qua context → optimistic update không được rollback | ✅ Đã fix |
| 03 | 🟠 Trung bình | `TodoList.tsx:41` | `key={index}` trên `<TodoItem>` → state bị nhầm khi xóa item | ✅ Đã fix |
| 04 | 🟠 Trung bình | `todos.ts:37` | `queryKey: ["todos"]` tĩnh — bỏ qua params `page`/`size` | ✅ Đã fix |
| 05 | 🟠 Trung bình | `useAuth.ts:23` | Logout không clear query cache — todo của user cũ bị serve cho user mới | ✅ Đã fix |
| 06 | 🟡 Thấp | `todos.ts:122` | `useToggleTodo` spread `updateTodo` — lộ `mutateAsync` raw | ✅ Đã fix |
| 07 | 🟡 Thấp | `useAuth.ts:9` | `localStorage.getItem` được gọi mỗi lần render — `isAuthenticated` không reactive | ✅ Đã fix |
| 08 | 🟡 Thấp | `ProtectedRoute.tsx:9` | JWT hết hạn vẫn qua được guard (chỉ kiểm tra tồn tại) | ✅ Đã fix |
| 09 | 🔴 Cao | `todos.ts:72` | `useTodos()` mặc định `size=10000` trong khi backend chỉ cho `size <= 100` | ✅ Đã fix |
| 10 | 🟠 Trung bình | `api.ts:30` | Interceptor 401 xóa token nhưng không clear TanStack Query cache | ✅ Đã fix |
| 11 | 🟡 Thấp | `TodoForm.tsx:63` | Đóng form tạo todo không reset draft nhập dở | ✅ Đã fix |
| 12 | 🟡 Thấp | `ProtectedRoute.tsx:8` | Guard chỉ kiểm tra `exp`, không kiểm tra token type/payload access token | ✅ Đã fix |

---

## BUG-01 — `<TodoForm>` thiếu `key` → `useForm` defaultValues bị stale

**Vị trí:** `src/features/todos/components/TodoList.tsx:53`

**Nguyên nhân:** `editingTodo && <TodoForm todo={editingTodo} ...>` không có prop `key`. Khi `editingTodo` chuyển từ todo A sang todo B, React tái sử dụng cùng component instance. `useForm` chỉ đọc `defaultValues` lúc mount → form vẫn hiện data của todo A.

**Fix:**
```tsx
<TodoForm key={editingTodo.id} mode="edit" todo={editingTodo} open={!!editingTodo} onClose={() => setEditingTodo(null)} />
```

---

## BUG-02 — `onError` bỏ qua context → optimistic update không được rollback

**Vị trí:** `src/features/todos/api/todos.ts:95`

**Nguyên nhân:** `onMutate` snapshot `previousTodos` và trả về `{ previousTodos }` làm context, nhưng `onError` được định nghĩa là `() => { toast.error(...) }` — không có tham số nào. Cache không được khôi phục khi mutation thất bại. UI hiện trạng thái optimistic sai cho đến khi `onSettled` invalidate, và mãi mãi nếu invalidation cũng thất bại.

**Fix:**
```ts
onError: (_err, _vars, context) => {
  if (context?.previousTodos) {
    queryClient.setQueryData<TodoListResponse>(["todos"], context.previousTodos);
  }
  toast.error("Failed to update todo");
},
```

---

## BUG-03 — `key={index}` trên `<TodoItem>` → state bị nhầm khi xóa

**Vị trí:** `src/features/todos/components/TodoList.tsx:41`

**Nguyên nhân:** `todos.map((todo, index) => <TodoItem key={index} ...>)` — khi xóa một todo ở giữa danh sách, tất cả item phía sau bị shift index. React reconcile theo index và gán nhầm state nội bộ (checkbox, hover) sang item khác.

**Fix:**
```tsx
todos.map((todo) => <TodoItem key={todo.id} ... />)
```

---

## BUG-04 — `queryKey: ["todos"]` tĩnh — bỏ qua params `page`/`size`

**Vị trí:** `src/features/todos/api/todos.ts:37`

**Nguyên nhân:** `useTodos(page, size)` truyền params lên API nhưng `queryKey: ["todos"]` được hardcode. Mọi lần gọi đều dùng chung một cache entry → pagination im lặng trả về data của lần fetch đầu tiên bất kể params là gì.

**Fix:**
```ts
queryKey: ["todos", { page, size }],
```

---

## BUG-05 — Logout không clear query cache — todo của user cũ bị serve cho user mới

**Vị trí:** `src/features/auth/hooks/useAuth.ts:23` — `logout`

**Nguyên nhân:** `logout()` navigate về `/login` nhưng không gọi `queryClient.clear()`. TanStack Query giữ data trong memory. Nếu user B đăng nhập ngay sau khi user A logout trên cùng browser session, `useTodos` serve todo của user A trước khi fetch mới hoàn thành.

**Fix:**
```ts
const logout = () => {
  logoutMutation.mutate(undefined, {
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
    onError: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      queryClient.clear();
      navigate("/login");
    },
  });
};
```

---

## BUG-06 — `useToggleTodo` spread `updateTodo` — lộ `mutateAsync` raw

**Vị trí:** `src/features/todos/api/todos.ts:122`

**Nguyên nhân:** `return { ...updateTodo, mutate: (todo: Todo) => { ... } }` override `mutate` nhưng để lộ `mutateAsync` với signature nội bộ `{ id, data }`. Bất kỳ caller nào dùng `mutateAsync(todo)` sẽ bypass wrapper và gửi payload sai lên API.

**Fix:**
```ts
return {
  mutate: (todo: Todo) => updateTodo.mutate({ id: todo.id, data: { completed: !todo.completed } }),
  isPending: updateTodo.isPending,
};
```

---

## BUG-07 — `isAuthenticated` đọc `localStorage` mỗi lần render — không reactive

**Vị trí:** `src/features/auth/hooks/useAuth.ts:9`

**Nguyên nhân:** `const token = localStorage.getItem("access_token")` được gọi inline trong render, không được bọc trong `useState`/`useEffect`. Không phản ứng với thay đổi token trong cùng session (ví dụ đăng nhập ở tab khác, hoặc ngay sau khi login trước khi có re-render từ nguyên nhân khác).

**Fix:**
```ts
const [token, setToken] = useState(() => localStorage.getItem("access_token"));
```

---

## BUG-08 — JWT hết hạn vẫn qua được `ProtectedRoute`

**Vị trí:** `src/router/ProtectedRoute.tsx:9`

**Nguyên nhân:** `localStorage.getItem("access_token")` chỉ kiểm tra sự tồn tại, không kiểm tra hết hạn. Token hết hạn vẫn qua guard, dashboard render, và user thấy lỗi API cho đến khi 401 interceptor trong `api.ts` redirect họ.

**Fix:**
```ts
function isTokenValid(token: string): boolean {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
```

---

## BUG-09 — `useTodos()` mặc định `size=10000` nhưng backend chỉ cho `size <= 100`

**Vị trí:** `src/features/todos/api/todos.ts:72`; `src/features/todos/components/TodoPage.tsx:13`

**Nguyên nhân:** Hook `useTodos(page = 1, size = 10000)` vẫn dùng page size rất lớn. Sau khi backend giới hạn `size` bằng `Query(..., le=100)`, màn hình dashboard gọi `useTodos()` không truyền tham số sẽ request `/todos?page=1&size=10000`. Backend trả 422, khiến danh sách todo không load được dù API và auth vẫn hoạt động.

**Fix đã áp dụng:**
```ts
export function useTodos(page: number = 1, size: number = 100) {
  return useQuery({
    queryKey: todosQueryKey(page, size),
    queryFn: async (): Promise<TodoListResponse> => {
      const response = await api.get("/todos", {
        params: { page, size },
      });
      return response.data;
    },
  });
}
```

Đã cập nhật test đang seed cache với `size: 10000` sang page size hợp lệ `100`.

**Đã fix:** Có  
**Tests:** `useTodos() defaults to a backend-supported page size`

---

## BUG-10 — Interceptor 401 không clear TanStack Query cache

**Vị trí:** `src/lib/api.ts:30`

**Nguyên nhân:** Khi API trả 401, interceptor chỉ xóa `access_token`, `refresh_token` rồi redirect về `/login`. Tuy nhiên TanStack Query cache vẫn còn trong memory. Trường hợp token hết hạn, bị revoke, hoặc logout từ tab khác, user đăng nhập lại trong cùng session có thể nhìn thấy `todos`/`currentUser` cũ trước khi request mới hoàn tất. BUG-05 đã xử lý luồng logout thủ công trong `useAuth`, nhưng chưa xử lý luồng 401 tự động ở axios interceptor.

**Fix đã áp dụng:**
```ts
import { queryClient } from "@/lib/queryClient";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      queryClient.clear();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```

Đã thêm test cho case 401 để đảm bảo token và cache đều bị xóa.

**Đã fix:** Có  
**Tests:** `clears local tokens and cached user data when API returns 401`

---

## BUG-11 — Đóng form tạo todo không reset draft nhập dở

**Vị trí:** `src/features/todos/components/TodoForm.tsx:63`; `src/features/todos/components/TodoForm.tsx:104`

**Nguyên nhân:** Form create chỉ gọi `reset()` khi tạo todo thành công. Nếu user nhập title/description rồi bấm Cancel hoặc đóng dialog, component vẫn được giữ mounted bởi `TodoPage`, nên lần mở tiếp theo form vẫn còn draft cũ. Điều này dễ làm user tạo nhầm todo với nội dung đã hủy.

**Fix đã áp dụng:**
```tsx
const handleClose = () => {
  if (mode === "create") {
    reset({ title: "", description: "" });
  }
  onClose();
};

return (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
    {/* ... */}
    <Button type="button" variant="outline" onClick={handleClose}>
      Cancel
    </Button>
  </Dialog>
);
```

**Đã fix:** Có  
**Tests:** `clears entered values after cancel and reopen`

---

## BUG-12 — `ProtectedRoute` chỉ kiểm tra `exp`, không kiểm tra token type/payload

**Vị trí:** `src/router/ProtectedRoute.tsx:8`

**Nguyên nhân:** Guard hiện parse JWT và chỉ kiểm tra `payload.exp * 1000 > Date.now()`. Nếu `localStorage.access_token` bị ghi nhầm bằng refresh token hoặc token có payload thiếu `type: "access"` nhưng vẫn còn hạn, frontend vẫn render dashboard trước khi request API bị backend từ chối 401. Đây là lỗi nhỏ vì backend vẫn là lớp bảo vệ chính, nhưng UX sẽ nhấp nháy sai trạng thái auth.

**Fix đã áp dụng:**
```ts
function isTokenValid(token: string): boolean {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return false;
    }

    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    const payload = JSON.parse(atob(paddedPayload));

    return (
      payload.type === "access" &&
      typeof payload.sub === "string" &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}
```

**Đã fix:** Có  
**Tests:** `redirects when token is not an access token`

---

## Ghi chú AI

Review code được hỗ trợ bởi Claude (Opus 4.8). Tất cả lỗi được kiểm tra thủ công với source code trước khi đưa vào báo cáo.
