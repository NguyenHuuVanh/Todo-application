---
description: Debug một issue cụ thể. Kích hoạt systematic debugging protocol.
---

# /debug

$ARGUMENTS

## Protocol

1. **Thu thập thông tin** — error message, file, line number, reproduction steps
2. **Đặt hypotheses** — liệt kê nguyên nhân, sắp xếp theo xác suất
3. **Investigate** — test từng hypothesis bằng cách đọc code
4. **Root cause** — giải thích tại sao
5. **Fix** — code trước/sau
6. **Prevention** — test hoặc validation

## Output format

```markdown
## 🔍 Debug: [Issue]

### Symptom
### Hypotheses
### Root Cause 🎯
### Fix
### Prevention 🛡️
```

## Ví dụ

```
/debug JWT token không bị reject khi hết hạn
/debug User A xem được todo của User B
/debug Cache trả về data sai sau khi update
/debug 422 Unprocessable Entity khi tạo todo
```
