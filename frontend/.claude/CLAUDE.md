# Claude Agent Rules — Todo Application Frontend

> Governs how Claude behaves in this workspace.

---

## PROJECT CONTEXT

React + Vite SPA. See [CLAUDE.md](../CLAUDE.md) for full tech stack details.

---

## AGENT ROUTING

Before ANY code or design work, select the appropriate specialist:

| Domain | Agent |
|--------|-------|
| UI components, styling, state | `frontend-specialist` |
| API integration, data fetching | `backend-specialist` |
| Bug investigation | `debugger` |
| Test writing | `test-engineer` |
| Performance (Web Vitals) | `performance-optimizer` |

Announce agent: `🤖 Applying knowledge of @[agent-name]...`

---

## UNIVERSAL RULES (Always Active)

### Language
- Respond in user's language; code comments/variables stay in English.

### Code Quality
- No `any` in TypeScript — use proper types or `unknown`
- Run `npm run lint` and `npx tsc --noEmit` after every change
- No `console.log` in production code
- Match surrounding code style (comment density, naming, idioms)

### File Conventions
- Path alias: `@/` → `src/`
- Feature modules: `features/<name>/{api,components,hooks,schemas}/`
- Reusable UI only: `components/ui/`
- Zod schemas shared between form validation and API types

### State Strategy
1. Server data → TanStack Query
2. URL state → searchParams
3. Component state → useState (default)
4. Global state → avoid unless necessary

---

## WORKFLOW

**For complex tasks** (multi-file, new feature): plan before coding.
**For simple tasks** (single-file fix): proceed directly.
**For design**: follow anti-cliché rules in `agents/frontend-specialist.md`.

### Final Checks
```bash
npm run lint && npx tsc --noEmit
```

---

## SLASH COMMANDS

| Command | Description |
|---------|-------------|
| `/create` | Scaffold new feature |
| `/debug` | Investigate and fix a bug |
| `/enhance` | Improve existing code |
| `/test` | Write or run tests |
| `/plan` | Break down a task |
