# /debug — Investigate and Fix Bug

Systematic debugging protocol.

## Usage
```
/debug <description-of-issue>
```

## Process
1. **Reproduce**: Ask user for exact error message, steps to reproduce, expected vs actual behavior
2. **Locate**: 
   - Check browser console for errors
   - Check network tab for failed requests
   - Trace from symptom to root cause (don't guess)
3. **Read code**: Examine relevant files before suggesting fix
4. **Fix minimal**: Change only what's needed
5. **Verify**: Run lint + tsc, test the fix

## Common Patterns

**401 loop:**
- Check `src/lib/api.ts` response interceptor
- Verify token in localStorage

**Query not updating:**
- Check TanStack Query staleTime/cacheTime in `src/lib/queryClient.ts`
- Verify query key matches

**Form validation fails:**
- Check Zod schema in `features/<name>/schemas/`
- Verify form data structure matches schema

**Type errors:**
- Check API response types in `features/<name>/api/`
- Ensure schema types are exported and used

## Example
```
User: /debug login form not submitting
→ Reproduces issue, checks form + schema + API, identifies mismatch, fixes
```
