---
name: v2026-3-migration
description: Standardizes mobile UI components and backend routes to v2026.3 engineering standards (Zustand Selectors, FlashList, useMemo styling, and Zod validation). Use this when refactoring existing features or building new ones.
---

# v2026.3 Migration & Standards Skill

Use this skill to ensure every component, hook, and route follows the high-performance and type-safe mandates of GoalBuddy v2026.3.

## 📱 Mobile Standard Patterns

### 1. Zustand Selectors (Mandatory)
Never destructure the store. Always use fine-grained selectors to prevent re-render loops.
```typescript
// ✅ CORRECT
const colors = useThemeStore((s) => s.colors);
const themeKey = useThemeStore((s) => s.themeKey);

// ❌ WRONG
const { colors, themeKey } = useThemeStore();
```

### 2. High-Performance Lists (FlashList)
Use `@shopify/flash-list` for all scrollable collections. Provide an `estimatedItemSize`.
```typescript
<FlashList
  data={data}
  renderItem={({ item }) => <MyCard item={item} />}
  estimatedItemSize={120}
  contentContainerStyle={{ padding: 16 }}
/>
```

### 3. Memoized Styling
Always wrap `makeStyles` in `useMemo` and pass the `colors` object.
```typescript
const colors = useThemeStore((s) => s.colors);
const s = useMemo(() => makeStyles(colors), [colors]);
```

### 4. Query Key Factories
Never hardcode string keys in `useQuery` or `useMutation`. Use the factory defined in the feature's `hooks.ts`.
```typescript
// hooks.ts
export const goalKeys = {
  all: ['goals'] as const,
  detail: (id: string) => [...goalKeys.all, 'detail', id] as const,
};
```

---

## 🛠 Backend Standard Patterns

### 1. Zod Validation Middleware
Every route must have a schema and use the `validate()` middleware.
```typescript
const mySchema = z.object({
  body: z.object({
    title: z.string().min(1),
  }),
});

router.post('/', validate(mySchema), async (req, res) => { ... });
```

### 2. Standardized Error Responses
All errors must return the `{ error, code, retryable }` structure.
```typescript
res.status(404).json({ 
  error: 'Not found', 
  code: 'NOT_FOUND', 
  retryable: false 
});
```

## 🏁 Checklist for "Done"
- [ ] Zustand: Are selectors used for all state access?
- [ ] Styling: Is `makeStyles` wrapped in `useMemo`?
- [ ] Lists: If it's a list, is it a `FlashList`?
- [ ] Validation: Does the route use a Zod schema?
- [ ] Errors: Do error responses follow the v2026.3 format?
- [ ] Offline: Does the store use MMKV?
