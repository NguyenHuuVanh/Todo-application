---
trigger: always_on
---

# Frontend — Todo Application (Developer Assessment)

> File này định nghĩa cách Claude AI hoạt động trong workspace frontend này.
> Tuân theo hệ thống Antigravity Kit tại `.agent/`.

React + Vite SPA. Part of a full-stack bug-hunting assessment. The codebase contains **intentional bugs** across frontend, backend, and infrastructure layers.

---

## CRITICAL: ĐỌC TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ

**Ưu tiên quy tắc:** `CLAUDE.md` (P0) > `.claude/CLAUDE.md` (P1) > Agent `.md` (P2)

Trước khi implement bất kỳ thứ gì:

1. Đọc `.claude/CLAUDE.md` — quy tắc agent routing
2. Chọn agent từ `.claude/agents/` phù hợp với task
3. Thông báo agent đang dùng theo format bắt buộc

---

## 🗺️ AGENT ROUTING — DỰ ÁN NÀY

| Task | Agent |
|------|-------|
| UI components, styling, state, forms | `frontend-specialist` |
| Bug investigation, root cause | `debugger` |
| Unit/integration tests (Vitest) | `test-engineer` |

**Format bắt buộc khi áp dụng agent:**
```
🤖 **Áp dụng kiến thức của `@[agent-name]`...**
```

---

## 📋 BỐI CẢNH ĐỀ BÀI (ASSESSMENT)

Đây là bài đánh giá năng lực developer. Codebase **cố ý chứa bugs** ở nhiều tầng.

**Mục tiêu**: Tìm và fix ít nhất **5 issues có ý nghĩa** (≥2 backend, ≥1 frontend).

**Thứ tự ưu tiên khi review:**

1. 🔴 Security & auth state leaks
2. 🔴 Data corruption bugs (stale state, wrong cache keys)
3. 🟠 Optimistic update rollback missing
4. 🟠 React key violations causing state bleed
5. 🟡 Form state not resetting
6. 🟡 Query keys ignoring params
7. 🟢 localStorage not reactive
8. 🟢 Minor conventions

**Quy tắc cứng:**
- ❌ Không rewrite toàn bộ app
- ❌ Không thêm dependency mới nếu không cần thiết
- ✅ Mỗi fix quan trọng phải có test (nếu thực tế)

**Format bug report:**
```markdown
### [Tên issue]
**Location:** `path/to/file:line`, tên function/component
**Reason:** Tại sao đây là bug.
**Fix Proposal:** Giải thích ngắn gọn / snippet.
**Implemented:** Yes/No
**Tests:** Test nào được thêm/cập nhật.
```

---

## Assessment Context (English)

**Goal**: identify and fix meaningful issues — prioritize correctness, security, data isolation over cosmetic cleanup.  
**Minimum**: fix 5 issues (≥2 backend, ≥1 frontend), add tests where practical.  
**Branch**: `assessment/bug-hunting`

## Tech Stack

- **React 19** + **TypeScript 6** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7** — client-side routing
- **TanStack Query v5** — server state
- **React Hook Form v7** + **Zod v4** — forms & validation
- **shadcn/ui** (Radix + CVA) — UI primitives
- **Axios** — HTTP client with auth interceptors
- **Sonner** — toasts

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm test         # Vitest run
```

## Project Structure

```
src/
├── components/ui/          # shadcn/ui primitives
├── features/
│   ├── auth/               # api/, components/, hooks/, schemas/
│   └── todos/              # api/, components/, schemas/
├── lib/
│   ├── api.ts              # axios instance + 401 interceptor
│   ├── queryClient.ts      # TanStack Query config
│   └── utils.ts            # cn()
├── pages/                  # LoginPage, RegisterPage, DashboardPage
└── router/
    ├── index.tsx
    └── ProtectedRoute.tsx
```

## Conventions

- Path alias `@/` → `src/`
- API base: `VITE_API_URL` env var (default `http://localhost:8000/api/v1`)
- Auth: JWT in `localStorage` (`access_token`, `refresh_token`); 401 → redirect `/login`
- Feature modules are self-contained: co-locate `api/`, `components/`, `hooks/`, `schemas/`

## ✅ FRONTEND BUG-FIX STATUS

Nguồn sự thật hiện tại: `frontend/docs/BUGS_REPORT.md`.

Các bug frontend đã report hiện đều đã fix. Khi tiếp tục làm frontend, không săn lại các line number cũ vì code đã thay đổi; hãy kiểm tra regression quanh các nhóm sau:

| Area | Trạng thái hiện tại |
|------|---------------------|
| `TodoForm` stale default values khi đổi edit target | Fixed + tested |
| React list key dùng index | Fixed + tested |
| React Query key thiếu `page`/`size` | Fixed + tested |
| Optimistic update rollback | Fixed + tested |
| Delete/toggle/update todo hiển thị sai do cache mismatch | Fixed + tested |
| `useToggleTodo` expose raw mutation shape | Fixed + tested |
| Logout/auth guard clear user-scoped cache | Fixed + tested |
| Expired JWT qua `ProtectedRoute` | Fixed + tested |

Nếu phát hiện bug mới:

1. Xác minh bug vẫn tồn tại với code hiện tại.
2. Không dùng line number cũ từ report làm bằng chứng duy nhất.
3. Thêm hoặc cập nhật Vitest nếu bug liên quan state/cache/form/auth.
4. Cập nhật `frontend/docs/BUGS_REPORT.md` nếu thay đổi phạm vi report.

## Environment

```env
VITE_API_URL=http://localhost:8000
```

---

## 🔧 LỆNH THƯỜNG DÙNG

```bash
npm run dev              # Vite dev server
npm run build            # tsc -b && vite build
npm run lint             # eslint
npm test                 # vitest run
npx tsc --noEmit         # type check
```

---

## 💡 CONVENTIONS BẮT BUỘC

```tsx
// ✅ Named exports (không dùng default export)
export function TodoItem(...) {}

// ✅ Zod schema dùng chung cho form validation và API types
const schema = z.object({ title: z.string().min(1) });
type FormData = z.infer<typeof schema>;

// ✅ Query key phải include tất cả params ảnh hưởng đến data
queryKey: ["todos", { page, size, filter }]

// ✅ Mutations phải dùng QueryClient từ provider, không import singleton khi hook có thể được test
const queryClient = useQueryClient();

// ✅ Optimistic update PHẢI snapshot và rollback mọi active todo query
onError: (_err, _vars, context) => {
  context.previousTodos.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

// ✅ key prop dùng entity id, không dùng index
{todos.map((todo) => <TodoItem key={todo.id} ... />)}

// ✅ Dialog/Form tái sử dụng phải có key để force remount
<TodoForm key={editingTodo.id} todo={editingTodo} ... />

// ✅ Logout phải clear user-scoped query cache
queryClient.clear();
```

---

## 📝 NGÔN NGỮ

- **Phản hồi cho user**: Tiếng Việt
- **Code, comments, commit messages**: English
