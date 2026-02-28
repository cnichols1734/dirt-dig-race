# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

DIG is a multiplayer underground racing game. It is an npm workspaces monorepo with three packages:

| Package | Path | Description |
|---|---|---|
| `@dig/shared` | `shared/` | Shared types, constants, game balance values |
| `@dig/server` | `server/` | Game server (Express + Socket.io + SQLite) |
| `@dig/client` | `client/` | Browser client (Vite + React 19 + PixiJS 8) |

### Running services

- **Server**: `npm run dev` in `server/` — runs `tsx watch` on port 3001
- **Client**: `npm run dev` in `client/` — runs Vite dev server on port 5173

No external databases or services are required; SQLite is embedded via `better-sqlite3`.

### Lint / Type-check / Build

- No ESLint or Prettier is configured in this project.
- No test framework (Jest, Vitest, etc.) is configured.
- TypeScript type-checking: `npx tsc --noEmit -p client/tsconfig.json` and `npx tsc --noEmit -p server/tsconfig.json`
- Client production build: `npm run build` in `client/` (runs `tsc && vite build`)
- Server production build: `npm run build` in `server/` (runs `tsc`)

### Non-obvious notes

- The project is early-stage; most game logic classes are stubs with TODO comments.
- The `@dig/shared` package has no build step — it exposes TypeScript sources directly via `"main": "src/index.ts"`.
- The client canvas renders with PixiJS on a `<canvas id="game">` element, with a React overlay on `<div id="root">` using `pointer-events: none` (re-enabled on children).
- WebGL deprecation warnings in the browser console (about `swiftshader`) are harmless environment artifacts and can be ignored.
