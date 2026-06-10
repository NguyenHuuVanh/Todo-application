# /test — Write or Run Tests

Test creation and execution for React + Vite + Vitest.

## Usage
```
/test <what-to-test>
```

## Setup (if not configured)
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `vite.config.ts`:
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
}
```

## What to Test

**Custom hooks:**
```ts
// features/todos/hooks/useTodos.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useTodos } from './useTodos'

it('fetches todos on mount', async () => {
  const { result } = renderHook(() => useTodos())
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toHaveLength(3)
})
```

**Zod schemas:**
```ts
// features/todos/schemas/todo.test.ts
import { todoSchema } from './todo'

it('validates todo', () => {
  expect(() => todoSchema.parse({ title: 'Test' })).not.toThrow()
  expect(() => todoSchema.parse({ title: '' })).toThrow()
})
```

**Components:**
```ts
// features/todos/components/TodoItem.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoItem } from './TodoItem'

it('calls onToggle when checkbox clicked', async () => {
  const onToggle = vi.fn()
  render(<TodoItem todo={mockTodo} onToggle={onToggle} />)
  await userEvent.click(screen.getByRole('checkbox'))
  expect(onToggle).toHaveBeenCalledWith(mockTodo.id)
})
```

## Run Tests
```bash
npm test              # run all tests
npm test -- TodoItem  # run specific test
npm test -- --coverage  # coverage report
```

## Example
```
User: /test useTodos hook
→ Creates useTodos.test.ts with mock API, tests loading/success/error states
```
