# /enhance — Improve Existing Code

Refactoring, optimization, or feature enhancement.

## Usage
```
/enhance <what-to-improve>
```

## Process
1. **Read current code**: Understand what exists
2. **Ask clarifying questions**:
   - What aspect to improve? (performance, readability, accessibility, UX)
   - Any constraints? (breaking changes allowed?)
3. **Plan**: If multi-file changes, outline approach first
4. **Execute**: Make improvements
5. **Verify**: Run lint + tsc, test functionality

## Improvement Categories

**Performance:**
- Measure first (React DevTools Profiler)
- Add React.memo only if needed
- Lazy load heavy components
- Optimize images

**Code quality:**
- Extract reusable logic to custom hooks
- Split large components
- Add proper TypeScript types
- Improve naming

**UX:**
- Add loading states
- Add error boundaries
- Improve form validation messages
- Add keyboard shortcuts

**Accessibility:**
- Add ARIA labels
- Ensure keyboard navigation
- Check color contrast
- Test with screen reader

## Example
```
User: /enhance todo form validation messages
→ Reads TodoForm, improves Zod error messages, adds toast on success
```
