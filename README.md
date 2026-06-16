# Fateline — Open-Source Moddable Life Simulator: Specification

## Context

The user wants to build an open-source alternative to **BitLife** (a text-based life-simulation game). The core grievance with BitLife is its monetization: expensive, overpriced expansion packs locked behind paywalls. The goal is a free, open-source game where the "expansions" are community-contributed **modules** that anyone can create and share — most easily by linking a GitHub repo.

This document is a **specification only** — no code is written yet (per the user's explicit choice). It defines the product, the architecture, the module system, and the cross-platform strategy so implementation can begin from a solid, agreed-upon foundation.

### Key constraints driving the design

- **Must run on iOS, Android, and web** from one codebase.
- **Apple App Store forbids downloading and executing arbitrary code at runtime.** This is the decisive constraint. It rules out a Minecraft-style "download and run JS/native plugins" model on iOS. The architecture therefore uses **data-driven content packs**: modules are _data_ (YAML/JSON) interpreted by a single, app-shipped engine — never downloaded code. This is App-Store-safe, easier for non-coders, and a natural fit for a life-sim where "content" is careers, events, scenarios, etc.
- The codebase must be **clean, well-organized, and follow current best practices** so external contributors can navigate it and build modules.

### Decisions locked with the user

- **Module model:** Data-driven content packs (no downloadable code).
- **Import sources (all four):** GitHub repo/release link, direct file upload, paste raw YAML/JSON, and a curated in-app registry.
- **Rules language:** Declarative conditions + weighted outcomes (no scripting, no expression evaluator in v1).
- **MVP scope for _this task_:** Specification only.
- **i18n / a11y:** Deferred (English-only; not a structural concern for v1).

---

## 1. Product Overview

**Fateline** is a turn-based, text-driven life simulator. The player is born with randomized stats, then advances year by year ("Age up"), encountering events, making choices, building relationships, pursuing careers, and accumulating outcomes until death. The base game ships a small but complete set of content; everything beyond that is a **module**.

A **module** ("expansion") is a downloadable content pack that adds:

- **Events** (life situations with choices and weighted outcomes)
- **Careers** (job ladders, requirements, salaries)
- **Activities / Actions** (things the player can actively choose each turn)
- **Items & Assets** (purchasable possessions)
- **Relationships / NPC archetypes**
- **Scenarios / starting conditions** (e.g. "born royalty", "born in poverty")
- **Locations / countries** (modifiers and flavor)
- **String/flavor content**

Modules are pure data. The engine that interprets them ships inside the app and is identical on every platform.

---

## 2. Technology Stack

Chosen for maximum code reuse across iOS + Android + web, strong typing, and a healthy modding/contributor ecosystem.

| Concern           | Choice                                                                                                   | Rationale                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Expo (React Native) + React Native Web**                                                               | One React/TypeScript codebase → iOS, Android, web. New Architecture (Fabric/TurboModules/Hermes) is the 2026 default. |
| Language          | **TypeScript (strict)**                                                                                  | Default for RN in 2026; essential for a typed module schema and a contributor-friendly engine.                        |
| Monorepo          | **pnpm workspaces + Turborepo**                                                                          | Standard for Expo + shared packages; clean separation of engine / app / schema / sample modules.                      |
| Styling           | **NativeWind (Tailwind for RN)**                                                                         | Consistent styling across native + web from one set of components.                                                    |
| State             | **Zustand**                                                                                              | Lightweight, testable, serializes cleanly for save games.                                                             |
| Schema/validation | **Zod**                                                                                                  | Runtime validation of untrusted module data + compile-time types from one source of truth.                            |
| Module format     | **YAML (authoring) → normalized to JSON**                                                                | YAML is friendlier for human authors; parsed/validated to JSON internally.                                            |
| Persistence       | **expo-sqlite** (saves) + **AsyncStorage/MMKV** (settings) + filesystem for installed module packages    | Robust local saves; no server required for core game.                                                                 |
| Testing           | **Vitest** (engine, pure logic) + **React Native Testing Library** (UI) + **Detox/Maestro** (E2E, later) | Engine is deterministic and unit-testable in isolation.                                                               |
| Tooling           | ESLint + Prettier + TypeScript project references                                                        | Enforced clean code for contributors.                                                                                 |

> Native modules are wrapped behind unified hooks/interfaces so platform differences never leak into game or engine code.

---

## 3. Repository Structure (Monorepo)

```
fateline/
├── apps/
│   ├── mobile/                 # Expo app (iOS + Android entry)
│   └── web/                    # Expo web (or Next.js host) entry
├── packages/
│   ├── engine/                 # ⭐ Pure, platform-agnostic game engine (no React, no RN)
│   │   ├── src/
│   │   │   ├── simulation/     # age-up loop, stat decay, life/death, RNG (seeded)
│   │   │   ├── events/         # event selection, condition eval, outcome resolution
│   │   │   ├── state/          # canonical game state types + reducers
│   │   │   └── index.ts
│   │   └── tests/              # Vitest unit tests — deterministic
│   ├── module-schema/          # ⭐ Zod schemas + TS types for module format (THE contract)
│   │   ├── src/schema.ts       # the versioned module manifest + content schemas
│   │   └── src/validate.ts     # validateModule(): safe parse of untrusted data
│   ├── module-loader/          # Fetch/import/validate/sandbox-merge modules at runtime
│   │   ├── src/sources/        # github.ts, fileUpload.ts, paste.ts, registry.ts
│   │   ├── src/install.ts      # download → unzip → validate → store → register
│   │   └── src/registry.ts     # local index of installed modules; conflict resolution
│   ├── ui/                     # Shared cross-platform components (NativeWind)
│   ├── store/                  # Zustand stores (game session, modules, settings)
│   ├── persistence/            # save/load, migrations (expo-sqlite)
│   └── cli/                    # ⭐ `fateline-validate` — author + CI module test harness (§11)
├── modules/
│   └── core/                   # ⭐ The base game shipped as a module (dogfoods the system)
│   └── sample-expansion/       # Reference module for authors to copy
├── docs/
│   ├── MODULE_AUTHORING.md     # How to write a module (the contributor's bible)
│   ├── ARCHITECTURE.md
│   └── module-schema.json      # Generated JSON Schema for editor autocomplete/validation
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Architectural principle:** `packages/engine` and `packages/module-schema` are **pure TypeScript with zero React/RN dependencies**. The engine takes (game state + loaded modules + a seeded RNG) and returns new state. This makes the entire game logic testable headlessly, reusable on any future platform, and the clean core that contributors reason about. The base game living in `modules/core/` proves the modding system can express the whole game.

---

## 4. Game Engine Design

### 4.1 Game State (canonical, serializable)

A single typed object — the save file:

- `character`: id, name, gender, age, alive, birth year
- `stats`: numeric stats keyed by id (e.g. health, happiness, smarts, looks). **No stat is hardcoded** — even the core four are declared in `modules/core/`. Modules add first-class stats via declarations (see §4.4).
- `flags`: arbitrary `Record<string, boolean | number | string>` set by events — the free-form variable bag for ad-hoc character/game-state variables that need no engine behavior (e.g. `hasDriverLicense`, `criminalRecord`, `degree`). See §4.4 for when to use a flag vs. a declared field.
- `relationships`: array of NPCs with relationship type + closeness + state
- `assets`: money, possessions, properties
- `career`: current job, level, salary, performance
- `history`: per-year log of events/choices (the scrollable life story)
- `rngState`: seeded PRNG state (saves are deterministic/replayable; aids debugging)
- `installedModuleIds` + versions (so a save knows which content it depends on)

### 4.2 The Turn Loop ("Age Up")

1. Increment age; apply automatic stat changes (aging, decay).
2. **Collect candidate events** from all enabled modules whose **conditions** match current state.
3. **Weight & select** events (weighted random via seeded RNG; respect cooldowns, once-only flags, category caps).
4. Present event → player picks a **choice**.
5. **Resolve outcome**: pick one weighted outcome from the chosen choice; apply its **effects** (stat deltas, flag sets, relationship/asset/career changes, follow-up event triggers).
6. Append to history; check life-status (death conditions); persist.

The player can also take **active actions** between age-ups (apply for job, go to gym, interact with relationship, buy item) — these are module-defined actions with the same conditions/effects vocabulary.

### 4.3 Determinism

All randomness flows through one seeded PRNG stored in the save. Same seed + same choices = same life. Critical for testing and reproducible bug reports.

### 4.4 Custom Fields — three tiers

Modules frequently need their own character/game-state variables. The engine supports a deliberate **three-tier model** so authors reach for the lightest tool that fits, and nothing is hardcoded.

| Need                                                                            | Mechanism                                            | Registration                           | Engine behavior                                                                                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ad-hoc, throwaway variable                                                      | `flags`                                              | None — just write to it from an effect | None: not shown in UI, not decayed, not clamped. Pure storage.                                                                       |
| First-class stat (UI bar, clamping, passive decay, referenced by other modules) | **declared stat** (`content/definitions/stats.yaml`) | Declared in a module                   | Treated exactly like a built-in stat: clamped to its range, optional yearly drift, displayable, referenceable in conditions/effects. |
| New _kinds_ of fields (resources, meters, currencies)                           | **Out of scope for v1**                              | —                                      | Documented as a future schema-version extension; flags + declared stats cover ~all BitLife-style needs.                              |

**Declared stat example** (`content/definitions/stats.yaml`):

```yaml
stats:
  - id: karma
    label: 'Karma'
    min: -100
    max: 100
    default: 0
    showInUI: true
    yearlyDelta: -2 # optional passive drift applied each age-up
  - id: faith
    label: 'Faith'
    min: 0
    max: 100
    default: 50
```

The engine clamps, displays, and decays `karma`/`faith` with no special-casing — because `health`, `happiness`, etc. in `modules/core/` are declared the exact same way. This is what makes "the base game is a module" literally true for stats.

**Namespacing & collision safety (decided):**

- **Declared fields are namespaced by module id** by default — internally `karma` becomes `medieval.karma`. Collision-proof: two modules can both declare `karma` without corrupting each other.
- To **interoperate on purpose**, a declaration sets `exposeAs: karma` to publish a stable global name other modules can read/write. Sharing is opt-in, never accidental.
- **Flags stay free-form** but the validator **warns on unprefixed flag names** and recommends the `com.author.mod/flag_name` convention to avoid silent cross-module clashes.
- The validator flags two modules declaring the **same global field id** as a conflict, resolved by load order (later wins) like other content overrides (§5.5).

> Rule of thumb for authors, to go in `docs/MODULE_AUTHORING.md`: _"If it just needs to be remembered, use a flag. If it needs to be seen, bounded, or shared, declare a stat."_

---

## 5. Module System (the heart of the project)

### 5.1 Module Package Layout

A module is a folder/zip:

```
my-module/
├── module.yaml          # manifest: id, name, version, author, description, engineVersion, dependencies
├── content/
│   ├── definitions/*.yaml   # declared stats / custom first-class fields (§4.4)
│   ├── events/*.yaml
│   ├── careers/*.yaml
│   ├── activities/*.yaml
│   ├── items/*.yaml
│   └── strings/*.yaml
└── assets/              # optional images/icons (static, validated types only)
```

### 5.2 Manifest (`module.yaml`)

```yaml
id: com.author.medieval-life # globally unique (reverse-DNS recommended)
name: Medieval Life
version: 1.2.0 # semver
engineVersion: '>=1.0.0 <2.0.0' # compatible engine range
author: Jane Doe
description: Adds a medieval era with knights, plagues, and royalty.
dependencies: [] # optional other module ids + version ranges
```

### 5.3 Declarative Rules Language (no code)

The agreed model: **declarative conditions + weighted outcomes.** Example event:

```yaml
id: evt.found-wallet
category: random
weight: 10
conditions: # ALL must be true (implicit AND; `any:`/`all:` for groups)
  - { stat: age, op: '>=', value: 6 }
  - { flag: in_jail, op: '==', value: false }
cooldownYears: 5 # don't refire too soon
once: false
title: 'You found a wallet on the sidewalk.'
choices:
  - text: 'Keep the money'
    outcomes:
      - weight: 70
        effects:
          - { asset: money, op: '+', value: 200 }
          - { stat: happiness, op: '+', value: 5 }
        resultText: 'You pocketed $200. Nice.'
      - weight: 30
        effects:
          - { flag: criminal_record, op: 'set', value: true }
          - { stat: happiness, op: '-', value: 10 }
        resultText: 'Someone saw you. The police were called.'
  - text: 'Turn it in'
    outcomes:
      - weight: 100
        effects:
          - { stat: happiness, op: '+', value: 8 }
        resultText: 'The owner rewarded your honesty.'
```

**Condition operators:** `==, !=, >, >=, <, <=, in`. Targets: `stat`, `flag`, `age`, `asset`, `relationship`, `career`, `random` (for probability gates). Grouping via `any:` / `all:`.
**Effect operators:** `+, -, *, set, push, remove`. Targets: stats, flags, assets, relationships, career, and `triggerEvent` for chains.

> Explicitly **out of scope for v1:** arbitrary expression formulas (e.g. `health - random(5,15)`) and any scripting. The declarative model covers ~95% of BitLife-style content and keeps modules safe and validatable. Expression support is a documented future extension behind a schema version bump.

### 5.4 Validation & Safety (critical — modules are untrusted input)

Every imported module passes through `packages/module-schema`:

1. **Parse** YAML → JSON.
2. **Zod schema validation** — reject anything malformed; produce human-readable errors.
3. **Reference integrity** — all referenced ids (careers, follow-up events, strings) resolve.
4. **Bounds/sanity** — stat deltas clamped; weights non-negative; no infinite trigger loops (cycle detection on `triggerEvent`).
5. **Asset whitelist** — only image/audio of allowed types & size; no executables, no scripts. Ever.
6. **Engine-version compatibility** check against manifest.

A module that fails validation is **rejected with a clear report** and never loaded. Because modules are data only, there is no code execution surface — this is what keeps it App-Store-safe.

### 5.5 Conflict Resolution & Load Order

- Modules can be enabled/disabled individually.
- Each piece of content is namespaced by module id.
- Deterministic load order (user-orderable list); later modules can **override** earlier content by id (documented), or **add** to it.
- Dependency resolution: a module declaring dependencies won't enable until they're present and version-compatible.

---

## 6. Module Distribution & Import (all four sources)

`packages/module-loader/src/sources/`:

1. **GitHub repo/release link** (`github.ts`)
   - User pastes a GitHub URL (repo, or specific release).
   - Loader resolves to a downloadable archive: prefer **latest release asset (zip)**; fall back to repo tarball of default branch via GitHub's public archive endpoint (no auth needed for public repos).
   - Download → unzip in-memory/temp → validate → install. _(No `git` required; plain HTTPS fetch.)_
   - Caches the resolved version; supports "check for update."

2. **Direct file upload** (`fileUpload.ts`)
   - `expo-document-picker` to pick a `.yaml`, `.json`, or `.zip` from device. Same validate→install pipeline.

3. **Paste raw YAML/JSON** (`paste.ts`)
   - Text box; ideal for quick/small modules and authoring/testing. Parses, validates, installs.

4. **Curated in-app registry** (`registry.ts`)
   - A central **manifest repo** (just a JSON index file hosted on GitHub/CDN) listing approved modules with metadata + their GitHub source URLs.
   - App fetches the index, shows a browsable/searchable list, and "Install" routes through the GitHub source path above.
   - Curation = PRs to the manifest repo; keeps discovery quality high without hosting infrastructure.

All four funnel into one pipeline: **acquire → unpack → validate (§5.4) → store (filesystem) → register (local index) → enable.** Installed modules persist locally and load offline thereafter.

---

## 7. App / UI Surface (MVP target, post-spec)

- **Home / New Life:** start a life (optionally pick a scenario from enabled modules).
- **Main game screen:** character + stats header, scrollable life-history feed, big **Age Up** button, **Actions** menu (module-defined activities), relationships/assets/career tabs.
- **Event modal:** title, choices, animated result text.
- **Modules screen:** installed list (enable/disable/reorder/remove), **+ Add Module** (the four import sources), **Browse Registry**, per-module detail + validation status.
- **Settings:** save management, seed display (for reproducible lives), about/credits.

Components live in `packages/ui`, are platform-agnostic (NativeWind), and render identically on native + web.

---

## 8. Open-Source & Contribution Posture

- **License:** permissive (MIT) for the engine/app to maximize contribution; modules carry their own licenses.
- `docs/MODULE_AUTHORING.md` is the contributor entry point; ship `modules/sample-expansion/` as a copy-paste starting point.
- Generate a **JSON Schema** (`docs/module-schema.json`) from the Zod schema so authors get autocomplete + inline validation in VS Code.
- The base game is `modules/core/` — proving the system and serving as the largest worked example.

---

## 9. Build Phases — ✅ all complete

All phases below are implemented, committed, and verified green (format, lint,
typecheck, tests with coverage gates, and a web build smoke check).

1. ✅ **Phase 0 — Scaffold:** monorepo (pnpm + Turbo), TS strict, lint/format, CI with Vitest + coverage gates from day one (§11.3).
2. ✅ **Phase 1 — Schema + Engine core:** `module-schema` (Zod) and `engine` (turn loop, conditions, outcomes, seeded RNG) with golden-life, unit, property-based, and adversarial tests (§11.1) — headless.
3. ✅ **Phase 2 — Core content module:** `modules/core/` plays a full deterministic life to a natural death; `@fateline/module-io` loads the on-disk YAML layout.
4. ✅ **Phase 3 — Module test harness:** `packages/cli` `fateline-validate` (validation + headless seeded smoke test, §11.2), esbuild-bundled binary.
5. ✅ **Phase 4 — App UI:** `@fateline/store` (Zustand) + `@fateline/persistence` + `@fateline/ui`, wired into the `apps/mobile` Expo app (New Life / Play / Modules screens) with dynamic stat rendering; verified via `expo export --platform web`.
6. ✅ **Phase 5 — Module loader:** `@fateline/module-loader` — the four import sources + one install pipeline + Modules screen.
7. ✅ **Phase 6 — Registry + docs:** `registry/index.json` with a CI merge gate running `fateline-validate` (§11.2), `docs/MODULE_AUTHORING.md`, `docs/ARCHITECTURE.md`, generated `docs/module-schema.json`, `modules/sample-expansion/`, MIT `LICENSE`.
8. ✅ **Phase 7 — Hardening:** save migrations + autosave wired into the app, E2E smoke flow (`.maestro/new-life.yaml`), `docs/STORE_COMPLIANCE.md`.

### As-built notes (deviations from the original plan)

- **One Expo app, not separate `apps/web` + `apps/mobile`.** Expo's web target covers the web build from the single `apps/mobile` codebase, so a second app would have been redundant.
- **The CLI harness was built in its own phase (3)** ahead of the UI, because module quality gating is more foundational than screens.
- **`fateline-validate --with <dir>`** composes a base module (core) before smoke-testing an expansion, since an expansion has no terminal condition on its own.
- **`modules/core` ships a generated `core.json`** (committed) so the app imports the base game as a bundlable object — React Native can't read YAML from disk at runtime. A test asserts it stays in sync with the YAML source.
- **NativeWind/Tailwind:** styling currently uses React Native `StyleSheet`; NativeWind can be layered on without changing component APIs.

---

## 10. Verification (how we'll know the spec's architecture holds up)

Because this task produces a document, "verification" means the spec is internally consistent and de-risks the hard parts. The architecture is validated against these acceptance checks for the eventual build:

- **Engine determinism:** a Vitest suite runs a fixed seed + scripted choices and asserts an exact resulting game state.
- **Schema rejects bad modules:** unit tests feed malformed/malicious YAML and assert clear rejection (no crash, no execution).
- **Dogfooding:** the base game runs entirely as a loaded module — if `modules/core/` can express a full life, third-party modules can express anything comparable.
- **Cross-platform parity:** the same `packages/ui` screens render and the same engine produces identical state on iOS, Android, and web.
- **App Store safety:** no code path downloads or evaluates executable code; modules are data validated by Zod before use.

---

## 11. Testing Strategy

Two distinct testing problems, addressed separately. Because this is open-source and accepts untrusted modules from strangers, testing is a first-class concern, not an afterthought.

### 11.1 Testing our code (engine, schema, loader, UI)

| Layer                             | Tool                         | What it covers                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engine — golden life tests** ⭐ | Vitest                       | Fixed seed + scripted choices → assert the _exact_ final game state. Highest-value tests in the project; catch any unintended behavior change. Enabled by the seeded PRNG (§4.3).                                                         |
| **Engine — unit**                 | Vitest                       | Condition evaluator (every operator + `any`/`all` grouping), effect resolver, stat clamping, declared-field decay (§4.4), turn loop, death conditions.                                                                                    |
| **Engine — property-based**       | Vitest + fast-check          | Thousands of random seeds asserting invariants that must _always_ hold: stats stay in range, money never NaN, turn loop always terminates, a dead character can't age up. Finds emergent/module-interaction bugs hand-written tests miss. |
| **Schema/loader — adversarial**   | Vitest                       | Malformed/malicious/pathological YAML → assert clean rejection, readable error, **no crash, no execution**: wrong types, unknown fields, negative weights, circular `triggerEvent`, oversized files, unresolved id references.            |
| **UI — component**                | React Native Testing Library | Screens render; the **dynamic stat rendering** case (a module's declared stat bar appears with no code change, per §4.4).                                                                                                                 |
| **E2E**                           | Maestro                      | (Phase 6) start a life → age up → install a module → play it.                                                                                                                                                                             |

**Fixtures are the real modules:** `modules/core/` and `modules/sample-expansion/` double as test fixtures, so the base game is part of the engine test suite — dogfooding again.

### 11.2 Testing community modules — the `fateline-validate` harness ⭐

`packages/cli` ships a CLI (`fateline-validate <module-path>`) that runs:

1. **Schema + safety validation** — the full §5.4 pipeline (Zod, reference integrity, bounds, cycle detection, asset whitelist, engine-version check).
2. **Headless seeded smoke test** — runs _N_ seeded lives with the module enabled and asserts: no crash, no stuck/unwinnable states, stats stay bounded, turn loop terminates. Reuses the pure `engine` package — no app required.

This harness is used in two places:

- **Authors run it locally** before submitting — instant feedback, no app, no device.
- **The curated registry repo runs it in CI** on every PR. **A module cannot merge into the registry unless it passes validation + the smoke test.** This is how the project scales community contributions with near-zero manual review.

### 11.3 CI & coverage policy

- **Our CI (GitHub Actions):** lint + typecheck + Vitest + build on every push/PR, across the workspace.
- **Coverage gate (decided): strict on core, relaxed on UI.** Enforce a high threshold (≈90%) on `packages/engine` and `packages/module-schema` — the trust-critical, pure-logic packages where bugs are costly and tests are cheap. No hard percentage gate on `ui`/`apps` (tested by judgment via component tests), to avoid pressuring contributors into low-value UI-glue tests.

---

## Deliverable for this task

This specification document. No source files are created. On approval, implementation proceeds per the phased roadmap (§9), starting with the monorepo scaffold and the pure engine + schema packages.
