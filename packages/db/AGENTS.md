# DevMentor DB — Database Layer

**Purpose:** MikroORM entities, repositories, migrations. Only package importing `@mikro-orm/*`.

## Structure
```
packages/db/src/
├── config/
│   └── mikro-orm.config.ts  # PostgreSQL config
├── entities/<concept>/<name>.entity.ts  # defineEntity
├── repositories/<Name>Repository.ts    # Data access
└── migrations/<timestamp>-<desc>.ts    # Up/down functions
```

## Entity Conventions
- **File:** `entities/<concept>/<singular>.entity.ts`
- **Class:** PascalCase via `defineEntity()`
- **Table:** Explicit `tableName` — snake_case plural
- **Name:** Explicit `name` property — singular PascalCase
- **Columns:** camelCase → snake_case

**Example:**
```typescript
// entities/mentors/mentor.entity.ts
export const Mentor = defineEntity({
  name: 'Mentor',
  tableName: 'mentors',
  // ...properties
});
```

## Repositories
- **File:** `repositories/<Name>Repository.ts`
- **Class:** PascalCase + `Repository` suffix
- **Constructor:** Accept `EntityManager`
- **Purpose:** Complex queries, data access abstraction

## Migrations
- **Command:** `npm run migrate` (apply), `npm run migrate:down` (rollback)
- **File:** `migrations/<YYYYMMDDHHMMSS>-<description>.ts`
- **Required:** Both `up()` and `down()` must work
- **Rule:** Never edit old migrations — create new ones

## Connection
- **Driver:** PostgreSQL
- **Pooling:** Managed by MikroORM
- **Lazy loading:** Enabled
- **Migrations dir:** `src/migrations/`
- **Entities dir:** `src/entities/`

## Environment
- DATABASE_URL (required)
- DATABASE_SSL (optional)
