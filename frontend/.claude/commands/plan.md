# /plan — Task Breakdown

Breaks down complex tasks into actionable steps.

## Usage
```
/plan <complex-task>
```

## Process
1. **Analyze**: Understand the full scope
2. **Ask**: Clarify unknowns (UI preferences, API contract, constraints)
3. **Decompose**: Break into logical phases
4. **Prioritize**: Critical path first
5. **Document**: Create step-by-step plan with file paths

## Output Format
```markdown
## Goal
[Clear statement of what we're building]

## Questions (if any)
- [ ] Question 1
- [ ] Question 2

## Steps
1. [ ] Step 1: Create schema (src/features/X/schemas/X.ts)
2. [ ] Step 2: API functions (src/features/X/api/X.ts)
3. [ ] Step 3: Components (src/features/X/components/)
4. [ ] Step 4: Hook up router (src/router/index.tsx)
5. [ ] Step 5: Tests
6. [ ] Step 6: Verify (lint + tsc)

## Files to Create/Modify
- `src/features/X/...`
- `src/router/index.tsx`
```

## When to Use
- Multi-file features
- Refactoring across features
- Integration work (API + UI + routing)
- Anything taking >15 minutes

## Example
```
User: /plan add category filter to todos
→ Breaks down: schema update, API query params, UI filter component, integration
```
