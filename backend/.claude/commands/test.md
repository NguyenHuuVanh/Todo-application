---
description: Chạy tests và báo cáo kết quả. Tạo tests mới nếu thiếu.
---

# /test

$ARGUMENTS

## Hành vi

Nếu `$ARGUMENTS` có giá trị:
- Tìm test liên quan đến keyword đó
- Chạy test đó và report kết quả

Nếu không có arguments:
- Chạy toàn bộ test suite
- Báo cáo pass/fail theo từng file

## Commands thực tế

```bash
# Toàn bộ
pytest -v

# Theo file
pytest tests/test_todos.py -v
pytest tests/test_auth.py -v

# Theo keyword
pytest -k "ownership" -v
pytest -k "security" -v

# Với coverage
pytest --cov=app --cov-report=term-missing
```

## Output format

```markdown
## 🧪 Test Results

### Passed ✅
- test_create_todo
- test_get_todos

### Failed ❌
- test_expired_token_rejected — AssertionError: 200 != 401

### Missing tests ⚠️
- Ownership check GET /{todo_id}
- Cache isolation per user

### Coverage
- app/api/v1/todos.py: 72%
- app/core/security.py: 45%
```

## Ví dụ

```
/test
/test ownership
/test jwt
/test cache
```
