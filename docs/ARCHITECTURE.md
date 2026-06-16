# Architecture

Fateline is a pnpm + Turborepo monorepo. The guiding rule (README §3): the
engine and schema are **pure TypeScript with no React/React Native**, so the
game logic is headlessly testable and reusable, and the base game ships as a
mod like any other.

## Packages

| Package                 | Role                                                                                                 | Deps on RN?  |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------ |
| `@fateline/mod-schema`  | Zod schemas + `validateModule` (the data contract; cycle/reference checks). §5.2–5.4.                | no           |
| `@fateline/engine`      | Seeded RNG, `GameState`, registry, condition evaluator, effect resolver, turn loop, `smokeTest`. §4. | no           |
| `@fateline/mod-io`      | `loadModuleFromDir` — read on-disk YAML layout and validate. §5.1.                                   | no (Node fs) |
| `@fateline/mod-loader`  | Four import sources + install pipeline + `ModuleStore`. §6.                                          | no (fetch)   |
| `@fateline/store`       | Zustand game session + `visibleStats` selector.                                                      | no           |
| `@fateline/persistence` | Save/load with versioned migration chain; pluggable `StorageBackend`.                                | no           |
| `@fateline/ui`          | Shared React Native presentational components + pure helpers.                                        | yes (peer)   |
| `@fateline/cli`         | `fateline-validate` (schema + headless smoke test). §11.2.                                           | no           |
| `mods/core`             | The base game, authored as data; ships a generated `core.json`.                                      | no           |
| `mods/sample-expansion` | Copyable reference mod.                                                                              | no           |
| `apps/mobile`           | Expo Router app → iOS / Android / web from one codebase. §7.                                         | yes          |

## Data flow

```
YAML / GitHub / paste / upload
        │  (mod-loader sources)
        ▼
  RawModuleFiles ──assemble──► validateModule (schema)
        │
        ▼
  FatelineModule(s) ──compileRegistry──► Registry
        │                                   │
        │                                   ▼
        │                         ageUp / applyChoice (engine)
        ▼                                   │
   ModuleStore (install)                    ▼
                                       GameState ──► store ──► UI
```

The engine never downloads or evaluates code — mods are data validated by
Zod before use. This is what keeps the app App-Store-safe (README §5.4).

## Determinism

All randomness flows through one seeded PRNG stored in `GameState.rng`. Same
seed + same choices ⇒ identical life. This powers golden-life tests and
reproducible bug reports (README §4.3, §11.1).

## Build / generated artifacts

- `mods/core/generated/core.json` — committed; the app imports the base game
  as a bundlable object (RN can't read YAML at runtime). Regenerate with
  `pnpm --filter @fateline/mod-core generate`; a test asserts it matches the
  YAML source.
- `docs/mod-schema.json` — committed JSON Schema generated from the Zod
  schema (`pnpm --filter @fateline/mod-schema generate:json-schema`).

## CI

- `ci.yml`: format, lint, typecheck, test (with coverage gates), web build.
- `registry.yml`: runs `fateline-validate` on bundled mods as a merge gate.

Coverage gates are strict (90%) on the trust-critical pure-logic packages
(engine, schema, store, io, persistence, loader) and relaxed on UI/CLI where a
few defensive branches are acceptable (README §11.3).
