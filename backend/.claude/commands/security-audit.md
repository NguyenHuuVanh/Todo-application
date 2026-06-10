---
description: Chạy security audit nhanh cho dự án này. Kiểm tra JWT, ownership, cache, DB constraints.
---

# /security-audit

Chạy security audit toàn bộ dự án theo checklist.

## Các bước thực hiện

1. Đọc `.claude/skills/vulnerability-scanner.md`
2. Kiểm tra từng issue theo thứ tự priority
3. Report theo format bug report
4. Đề xuất fix

## Format output

```markdown
## 🔒 Security Audit Report

### 🔴 Critical
- [ ] JWT verify_exp — `app/core/security.py:53`
- [ ] Ownership check GET — `app/api/v1/todos.py:89`
- [ ] Ownership check PUT — `app/api/v1/todos.py:105`
- [ ] Ownership check DELETE — `app/api/v1/todos.py:137`

### 🟠 High
- [ ] Cache key isolation — `app/api/v1/todos.py:37`
- [ ] Email unique constraint — `app/models/user.py:21`

### 🟡 Medium
- [ ] Cache invalidation sau mutations

### Tóm tắt
- X issues cần fix
- Ưu tiên fix: [list]
```

## Ví dụ

```
/security-audit
/security-audit jwt
/security-audit ownership
```
