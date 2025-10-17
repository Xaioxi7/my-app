# Forms

## Task Form
- `title`: string (1–100 chars, required)
- `due_date`: ISO date (optional)
- `status`: enum `todo | done` (default `todo`)
- `notes`: string (0–500 chars, optional)

### Validation
- `title` must not be empty.
- `due_date` must be a valid date or empty.

## Skill Form
- `name`: string (e.g., "TypeScript", "UX Design")
- `points`: number (0+)
- `level`: number (computed, read-only)

## Login Form
- `email`: string (valid email, required)
- `password`: string (8–64 chars, required)

## Signup Form
- `name`: string (1–50 chars)
- `email`: string (valid email, required)
- `password`: string (8–64 chars, required)

## Settings Form
- `timezone`: string (IANA tz, e.g., "America/Phoenix")
- `language`: enum `en | zh`
- `notifications`: boolean (default true)

## Moments Card (generated)
- `title`: string
- `summary`: string
- `source`: string (url)
- `reason`: string (why user might care)
- `tags`: string[]
- `published_at`: ISO date
