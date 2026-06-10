---
description: Review code theo assessment checklist. Tìm bugs theo thứ tự priority.
---

# /review

$ARGUMENTS

## Hành vi

Nếu có arguments — review file/module cụ thể đó.  
Nếu không — review toàn bộ theo assessment priority order.

## Thứ tự review

1. **Security** — JWT, ownership, input validation
2. **Auth** — token expiry, token type check
3. **Authorization** — cross-user data access
4. **Cache** — key isolation, invalidation
5. **DB** — constraints, N+1 queries
6. **Tests** — coverage cho security paths

## Output format cho mỗi issue

```markdown
### [Tên issue]
**Location:** `path/to/file`, line X  
**Reason:** Tại sao đây là bug.  
**Fix Proposal:** Snippet ngắn gọn.  
**Implemented:** No  
**Tests:** Cần viết test X.
```

## Ví dụ

```
/review
/review app/api/v1/todos.py
/review app/core/security.py
/review cache
```
