# /create — Scaffold New Feature

Creates a new feature module following project conventions.

## Usage
```
/create <feature-name>
```

## What It Creates
```
src/features/<feature-name>/
├── api/
│   └── <feature-name>.ts       # API functions (axios)
├── components/
│   └── <Feature>*.tsx           # Feature-specific components
├── hooks/
│   └── use<Feature>.ts          # Custom hooks
└── schemas/
    └── <feature-name>.ts        # Zod schemas
```

## Process
1. Ask user about feature requirements (data model, API endpoints, UI needs)
2. Create folder structure
3. Generate:
   - Zod schema
   - API functions with TanStack Query hooks
   - Base component
4. Update router if needed (add route in `src/router/index.tsx`)
5. Run `npm run lint && npx tsc --noEmit`

## Example
```
User: /create notifications
→ Creates src/features/notifications/ with schema, API, components
```
