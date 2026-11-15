# DevMentor Core Package — Business Logic Layer

**Purpose:** Framework-agnostic business logic, services, validators, and HTTP utilities.

**Import Rules:** 
- NO `next` or `react` imports
- Can import from `db/`
- Can be imported by `app/` and `ui/` (backend patterns)

## Structure

```
packages/core/
├── src/
│   ├── config/
│   │   └── env.ts          # Zod-validated environment
│   ├── container/
│   │   ├── container.ts    # Awilix DI container setup
│   │   └── cradle.ts       # DI cradle types
│   ├── events/
│   │   ├── event-bus.ts    # Typed event emitter
│   │   └── event-map.ts    # Event type registry
│   ├── http/
│   │   ├── apiHandler.ts   # Standard API response handler
│   │   ├── auth.ts         # Session/ownership helpers
│   │   ├── body.ts         # Request body validation
│   │   ├── envelope.ts     # Response envelope { ok, data | error }
│   │   ├── errors.ts       # AppError hierarchy
│   │   └── makeCrudRoute.ts # CRUD route generator
│   ├── security/
│   │   ├── csrf.ts         # CSRF validation
│   │   ├── password.ts     # bcrypt hashing (cost 12)
│   │   ├── rate-limit.ts   # In-memory rate limiting
│   │   └── session.ts      # JWT session management
│   ├── services/<concept>/ # Business services (one per concept)
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Utilities
│   ├── constants.ts        # Constants
│   ├── index.ts            # Isomorphic entry (client-safe)
│   └── server.ts           # Server entry (full container)
└── package.json
```

## Domain Concepts

Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`) has:
- Service: `services/<concept>/<name>.service.ts`
- Validators: `validators/<concept>/<name>.schema.ts` (Zod, shared client/server)

**Naming:**
- Services: PascalCase + `Service` suffix
- Schemas: camelCase variable + `Schema` suffix
- DI keys: camelCase, one per dependency

## Key Patterns

### 1. Services
- Accept `EntityManager` from MikroORM (via DI)
- Throw typed errors from `errors.ts` (NotFoundError, ValidationError, etc.)
- Use repositories from `db/` package
- Emit events via `eventBus` after successful mutations

**Event IDs:** `concept.entity.action` (e.g., `bookings.booking.created`)

### 2. HTTP Layer
- `apiHandler`: Wraps route handlers, catches AppError, returns standard envelope
- `makeCrudRoute`: Generates { GET, POST, PUT, DELETE } from schemas + service methods
- `requireSession`: Ensures authenticated session
- `optionalSession`: Gets session if available
- `assertOwns`: Checks record ownership (default deny)

### 3. Validation
- Zod schemas in `validators/`
- Shared between client and server
- Input data ALWAYS validated through Zod before processing
- Record author ALWAYS from session, never request body

### 4. DI Container (Awilix)
- Manual registration in `container/container.ts` (no `loadModules`)
- One line per dependency
- Services registered as classes or factories
- Cradle defined in `cradle.ts`

### 5. Error Handling
- `AppError` base class with HTTP status codes
- `NotFoundError` (404), `ForbiddenError` (403), `UnauthorizedError` (401)
- `ValidationError` (422), `ConflictError` (409)
- Routes do NOT have their own try/catch — handled by `apiHandler`

## Security

- **Passwords:** bcrypt cost 12, length 10-72
- **Sessions:** JWT HS256, 24h expiry, `httpOnly`, `SameSite=Lax`, `Secure` in production
- **CSRF:** Validated in `csrf.ts`, requires `x-requested-with: devmentor` header
- **Rate limiting:** In-process memory (login/registration), to be replaced with shared storage
- **Logging:** Masks passwords, tokens, JWT, cookies
- **DTO pattern:** Entities never leave `core` package — use DTOs

## Shared Types

Place in `src/types/`:
- Branded types for IDs (UserId, ArticleId, etc.)
- Request/response types
- Shared interfaces

## Testing

- Unit tests with Jest
- Test files next to implementation: `service.ts` + `service.test.ts`
- Mock dependencies using DI container overrides

## When to Read

- Implementing business logic
- Adding new services
- Working with validation schemas
- Handling authentication/authorization
- Using the event system
