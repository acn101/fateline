# Fateline — Open-Source Moddable Life Simulator: Specification

## Context

The user wants to build an open-source alternative to **BitLife** (a text-based life-simulation game). The core grievance with BitLife is its monetization: expensive, overpriced expansion packs locked behind paywalls. The goal is a free, open-source game where the "expansions" are community-contributed **mods** that anyone can create and share — most easily by linking a GitHub repo.

This document is a **specification only** — no code is written yet (per the user's explicit choice). It defines the product, the architecture, the mod system, and the cross-platform strategy so implementation can begin from a solid, agreed-upon foundation.

### Key constraints driving the design

- **Must run on iOS, Android, and web** from one codebase.
- **Apple App Store forbids downloading and executing arbitrary code at runtime.** This is the decisive constraint. It rules out a Minecraft-style "download and run JS/native plugins" model on iOS. The architecture therefore uses **data-driven content packs**: mods are _data_ (YAML/JSON) interpreted by a single, app-shipped engine — never downloaded code. This is App-Store-safe, easier for non-coders, and a natural fit for a life-sim where "content" is careers, events, scenarios, etc.
- The codebase must be **clean, well-organized, and follow current best practices** so external contributors can navigate it and build mods.

### Decisions locked with the user

- **Mod model:** Data-driven content packs (no downloadable code).
- **Import sources (all four):** GitHub repo/release link, direct file upload, paste raw YAML/JSON, and a curated in-app registry.
- **Rules language:** Declarative conditions + weighted outcomes (no scripting, no expression evaluator in v1).
- **MVP scope for _this task_:** Specification only.
- **i18n / a11y:** Deferred (English-only; not a structural concern for v1).

---

## 1. Product Overview

**Fateline** is a turn-based, text-driven life simulator. The player is born with randomized stats, then advances year by year ("Age up"), encountering events, making choices, building relationships, pursuing careers, and accumulating outcomes until death.

**Everything in the game is a mod.** There is no separate "base game" hardcoded apart from the mod system — the base game _is_ a mod (`core`), loaded through the exact same pipeline as any community expansion. A **mod** is a content pack that adds:

- **Events** (life situations with choices and weighted outcomes)
- **Actions** (things the player can actively choose each year — the Activities menu)
- **Careers & Education** (job/school ladders: requirements, salaries, promotion)
- **Assets** (ownable, purchasable possessions and property)
- **Relationships / NPC archetypes** (people you interact with year over year)
- **Ribbons** (end-of-life summaries)
- **Stats** (declared first-class fields), **scenarios**, **locations**, **flavor strings**

### Mods are data; the engine is the console

The one thing a mod is **not** is code. A mod is **pure data** (YAML/JSON) validated by the engine. The engine — which ships inside the app — provides a fixed set of **interpreters** that know how to _run_ each kind of content: how an event resolves, how an action is taken, how a career ladder promotes, how an asset appreciates. Think of it as a games console: the **engine is the console** (built-in, identical on every platform), and **mods are cartridges** (data the console knows how to read).

This split is non-negotiable and is what keeps the whole "install any mod from GitHub" idea App-Store-safe (§5.4): mods can add unlimited new careers, activities, people, and ribbons _as data_, but they can never download or run new _behavior_. Adding a genuinely new _kind_ of system (a new interpreter) is an engine change, shipped in the app binary — not something a downloaded mod can do. In practice this is rarely needed: the interpreters in §4.5 are general enough that BitLife's headline systems (crime, prison, fame) are just content, not new interpreters.

---

## 2. Technology Stack

Chosen for maximum code reuse across iOS + Android + web, strong typing, and a healthy modding/contributor ecosystem.

| Concern           | Choice                                                                                                   | Rationale                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Expo (React Native) + React Native Web**                                                               | One React/TypeScript codebase → iOS, Android, web. New Architecture (Fabric/TurboModules/Hermes) is the 2026 default. |
| Language          | **TypeScript (strict)**                                                                                  | Default for RN in 2026; essential for a typed mod schema and a contributor-friendly engine.                           |
| Monorepo          | **pnpm workspaces + Turborepo**                                                                          | Standard for Expo + shared packages; clean separation of engine / app / schema / sample mods.                         |
| Styling           | **NativeWind (Tailwind for RN)**                                                                         | Consistent styling across native + web from one set of components.                                                    |
| State             | **Zustand**                                                                                              | Lightweight, testable, serializes cleanly for save games.                                                             |
| Schema/validation | **Zod**                                                                                                  | Runtime validation of untrusted mod data + compile-time types from one source of truth.                               |
| Mod format        | **YAML (authoring) → normalized to JSON**                                                                | YAML is friendlier for human authors; parsed/validated to JSON internally.                                            |
| Persistence       | **expo-sqlite** (saves) + **AsyncStorage/MMKV** (settings) + filesystem for installed mod packages       | Robust local saves; no server required for core game.                                                                 |
| Testing           | **Vitest** (engine, pure logic) + **React Native Testing Library** (UI) + **Detox/Maestro** (E2E, later) | Engine is deterministic and unit-testable in isolation.                                                               |
| Tooling           | ESLint + Prettier + TypeScript project references                                                        | Enforced clean code for contributors.                                                                                 |

> Native mods are wrapped behind unified hooks/interfaces so platform differences never leak into game or engine code.

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
│   ├── mod-schema/          # ⭐ Zod schemas + TS types for mod format (THE contract)
│   │   ├── src/schema.ts       # the versioned mod manifest + content schemas
│   │   └── src/validate.ts     # validateModule(): safe parse of untrusted data
│   ├── mod-loader/          # Fetch/import/validate/sandbox-merge mods at runtime
│   │   ├── src/sources/        # github.ts, fileUpload.ts, paste.ts, registry.ts
│   │   ├── src/install.ts      # download → unzip → validate → store → register
│   │   └── src/registry.ts     # local index of installed mods; conflict resolution
│   ├── ui/                     # Shared cross-platform components (NativeWind)
│   ├── store/                  # Zustand stores (game session, mods, settings)
│   ├── persistence/            # save/load, migrations (expo-sqlite)
│   └── cli/                    # ⭐ `fateline-validate` — author + CI mod test harness (§11)
├── mods/
│   └── core/                   # ⭐ The base game shipped as a mod (dogfoods the system)
│   └── sample-expansion/       # Reference mod for authors to copy
├── docs/
│   ├── MOD_AUTHORING.md     # How to write a mod (the contributor's bible)
│   ├── ARCHITECTURE.md
│   └── mod-schema.json      # Generated JSON Schema for editor autocomplete/validation
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Architectural principle:** `packages/engine` and `packages/mod-schema` are **pure TypeScript with zero React/RN dependencies**. The engine takes (game state + loaded mods + a seeded RNG) and returns new state. This makes the entire game logic testable headlessly, reusable on any future platform, and the clean core that contributors reason about. The base game living in `mods/core/` proves the modding system can express the whole game.

---

## 4. Game Engine Design

### 4.1 Game State (canonical, serializable)

A single typed object — the save file:

- `character`: id, name, gender, age, alive, birth year
- `stats`: numeric stats keyed by id (e.g. health, happiness, smarts, looks). **No stat is hardcoded** — even the core four are declared in `mods/core/`. Mods add first-class stats via declarations (see §4.4).
- `flags`: arbitrary `Record<string, boolean | number | string>` set by events — the free-form variable bag for ad-hoc character/game-state variables that need no engine behavior (e.g. `hasDriverLicense`, `criminalRecord`, `degree`). See §4.4 for when to use a flag vs. a declared field.
- `relationships`: array of persistent NPCs — each with type, name, alive, per-relationship stats, and flags (§4.5.2)
- `assets`: the `money` balance and other fungible balances
- `ownedAssets`: instances of owned asset types with current value (§4.5.4)
- `career`: current job, level, years-in-level, salary, performance (§4.5.3)
- `actionMemory`: per-year action usage counts, reset each age-up (powers `perYearLimit`/cooldowns, §4.5.1)
- `history`: per-year log of events/choices (the scrollable life story)
- `ribbon`: the end-of-life summary awarded at death (§4.5.5)
- `rngState`: seeded PRNG state (saves are deterministic/replayable; aids debugging)
- `installedModuleIds` + versions (so a save knows which content it depends on)

### 4.2 The Turn Loop ("Age Up")

1. Increment age; apply automatic stat changes (aging, decay).
2. **Collect candidate events** from all enabled mods whose **conditions** match current state.
3. **Weight & select** events (weighted random via seeded RNG; respect cooldowns, once-only flags, category caps).
4. Present event → player picks a **choice**.
5. **Resolve outcome**: pick one weighted outcome from the chosen choice; apply its **effects** (stat deltas, flag sets, relationship/asset/career changes, follow-up event triggers).
6. Append to history; check life-status (death conditions); persist.

**A life is two interleaved loops, not just Age Up.** A BitLife-style life is roughly ~30% reacting to pushed random events (above) and ~70% the player _choosing what to do_ in between. So between age-ups the player freely takes **actions** (§4.5): go to the gym, apply for a job, interact with a specific person, commit a crime, buy a house. Actions are player-_pulled_ and repeatable within a year; events are engine-_pushed_ once per age-up. Both share the same conditions/effects vocabulary (§5.3). The interaction systems that make these actions meaningful — relationships, careers, education, assets, and the end-of-life ribbon — are defined in §4.5.

### 4.3 Determinism

All randomness flows through one seeded PRNG stored in the save. Same seed + same choices = same life. Critical for testing and reproducible bug reports.

### 4.4 Custom Fields — three tiers

Mods frequently need their own character/game-state variables. The engine supports a deliberate **three-tier model** so authors reach for the lightest tool that fits, and nothing is hardcoded.

| Need                                                                         | Mechanism                                            | Registration                           | Engine behavior                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ad-hoc, throwaway variable                                                   | `flags`                                              | None — just write to it from an effect | None: not shown in UI, not decayed, not clamped. Pure storage.                                                                       |
| First-class stat (UI bar, clamping, passive decay, referenced by other mods) | **declared stat** (`content/definitions/stats.yaml`) | Declared in a mod                      | Treated exactly like a built-in stat: clamped to its range, optional yearly drift, displayable, referenceable in conditions/effects. |
| New _kinds_ of fields (resources, meters, currencies)                        | **Out of scope for v1**                              | —                                      | Documented as a future schema-version extension; flags + declared stats cover ~all BitLife-style needs.                              |

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

The engine clamps, displays, and decays `karma`/`faith` with no special-casing — because `health`, `happiness`, etc. in `mods/core/` are declared the exact same way. This is what makes "the base game is a mod" literally true for stats.

**Namespacing & collision safety (decided):**

- **Declared fields are namespaced by mod id** by default — internally `karma` becomes `medieval.karma`. Collision-proof: two mods can both declare `karma` without corrupting each other.
- To **interoperate on purpose**, a declaration sets `exposeAs: karma` to publish a stable global name other mods can read/write. Sharing is opt-in, never accidental.
- **Flags stay free-form** but the validator **warns on unprefixed flag names** and recommends the `com.author.mod/flag_name` convention to avoid silent cross-mod clashes.
- The validator flags two mods declaring the **same global field id** as a conflict, resolved by load order (later wins) like other content overrides (§5.5).

> Rule of thumb for authors, to go in `docs/MOD_AUTHORING.md`: _"If it just needs to be remembered, use a flag. If it needs to be seen, bounded, or shared, declare a stat."_

### 4.5 Interaction Systems — the actual game

The event loop (§4.2) alone is thin. What makes a life sim feel alive is the set of **systems the player acts within** year over year. BitLife runs on an Activities menu, persistent relationships you interact with one-by-one, a career/education ladder, ownable assets, and an end-of-life summary. Fateline ships an **interpreter for each of these in the engine** (the "console"), and every actual job, person, and activity is **mod data fed to those interpreters** (the "cartridges", §1). The `core` mod supplies the base game's content through these interpreters — exactly as a third-party mod would (§8 dogfooding). Adding content of these kinds needs no engine change; adding a brand-new _kind_ of interpreter does.

All five systems reuse the existing `conditions`/`effects` vocabulary (§5.3). They are additive: the engine, schema, and content types extend; nothing about events, stats, or the RNG changes.

#### 4.5.1 Actions (the Activities menu)

An **action** is a repeatable, player-initiated choice available between age-ups — the Gym, Library, Meditate, "Find a job," "Commit a crime" entries. Where an event is _pushed_ by the engine and resolved once, an action is _pulled_ by the player and may be taken multiple times a year (subject to limits).

```yaml
# content/actions/gym.yaml
id: act.gym
label: 'Go to the gym'
category: 'mind-body'
conditions: [{ stat: age, op: '>=', value: 12 }] # when the action is offered
cost: { money: 50 } # optional resource cost to take it
perYearLimit: 3 # optional cap per year (default: unlimited)
outcomes: # same weighted-outcome model as events
  - weight: 80
    effects: [{ stat: health, op: '+', value: 5 }, { stat: looks, op: '+', value: 2 }]
    resultText: 'A solid workout. You feel stronger.'
  - weight: 20
    effects: [{ stat: health, op: '-', value: 3 }]
    resultText: 'You pulled a muscle.'
```

`GameState` gains `actionMemory` (per-year usage counts, reset on age-up) so `perYearLimit` and cooldowns work. The engine exposes `availableActions(state)` → the menu the UI renders, and `takeAction(state, actionId)` → resolves it like a choice.

#### 4.5.2 Relationships (persistent NPCs you interact with)

Relationships graduate from the unused stub into a real model. Each NPC is a persistent entity with its own relationship stats and a set of **relationship actions** you target _at a specific person_ (compliment, argue, date, propose, …).

```yaml
# state: GameState.relationships: Relationship[]
# Relationship = { id, name, type, alive, stats: { relationship: 0-100, ... }, flags }

# content/relationship-actions/compliment.yaml
id: rel.compliment
label: 'Compliment'
appliesTo: ['friend', 'partner', 'family'] # relationship types this targets
conditions: [{ rel.stat: relationship, op: '<', value: 100 }] # `rel.*` targets the chosen NPC
outcomes:
  - weight: 70
    effects: [{ rel.stat: relationship, op: '+', value: 8 }]
    resultText: 'They appreciated it.'
  - weight: 30
    effects: [{ rel.stat: relationship, op: '-', value: 4 }]
    resultText: 'It came off as insincere.'
```

New vocabulary, scoped to the targeted NPC: condition/effect targets `rel.stat`, `rel.flag`, `rel.type`. Effects also gain relationship-list operators: `addRelationship` (birth, meeting someone, marriage) and `removeRelationship` (death, breakup). NPCs can also be **generated** from declared archetypes (e.g. a `coworker` or `child` template) so events/actions can introduce new people.

#### 4.5.3 Careers & Education (the ladder)

A **career** is declared as a ladder of levels with entry requirements, salary, and promotion odds; **education** is the same shape (stages that gate careers). These are data, interpreted by an engine that knows how a ladder works.

```yaml
# content/careers/medicine.yaml
id: career.doctor
title: 'Doctor'
field: 'medicine'
requirements:
  [{ flag: degree_medicine, op: '==', value: true }, { stat: smarts, op: '>=', value: 70 }]
levels: # promotion ladder
  - { title: 'Resident', salary: 60000, promoteAfterYears: 2, promoteChance: 0.6 }
  - { title: 'Physician', salary: 120000, promoteAfterYears: 4, promoteChance: 0.4 }
  - { title: 'Chief of Medicine', salary: 300000 }
```

`GameState.career` (now real) tracks the current job, level, years-in-level, salary, and performance. The engine provides `applyToJob`, annual salary deposit, performance-driven `promote`/`fire` checks each age-up, and `quitJob`. Education works identically: declared programs with requirements that, on completion, set the degree flags careers require. Part-time jobs and one-off gigs are just actions (§4.5.1) with a `money` effect.

#### 4.5.4 Assets (ownable things)

An **asset type** is declared with a price, optional yearly upkeep, and optional appreciation/depreciation. The player buys, holds (paying upkeep, accruing value change), and sells.

```yaml
# content/assets/house.yaml
id: asset.house
label: 'Suburban House'
category: 'realestate'
price: 250000
yearlyUpkeep: 4000
yearlyValueChange: 0.03 # +3%/yr appreciation
conditions: [{ asset: money, op: '>=', value: 250000 }]
```

`GameState.ownedAssets` tracks instances with their current value. The engine handles purchase (debits money), per-age-up upkeep + revaluation, and sale (credits current value). Money remains the existing `money` asset balance.

#### 4.5.5 Ribbons (the end-of-life summary)

When the character dies, the engine awards exactly one **ribbon** — the headline summary of how they lived (BitLife's signature payoff). Ribbons are declared with conditions evaluated against the final `GameState`; the highest-priority matching ribbon wins.

```yaml
# content/ribbons/rich.yaml
id: ribbon.loaded
label: 'Loaded'
priority: 50 # higher wins ties
conditions: [{ asset: money, op: '>=', value: 5000000 }]
```

The engine evaluates ribbons in `checkDeath`, records the winner on the final state, and the UI shows it on the end screen. This doubles as a lightweight scoring/achievement hook mods can extend.

#### 4.5.6 Summary of additions

| System               | New `GameState`        | New content type                       | New cond/effect targets                                                  | New engine API                                            |
| -------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Actions §4.5.1       | `actionMemory`         | `actions`                              | (reuses existing)                                                        | `availableActions`, `takeAction`                          |
| Relationships §4.5.2 | `relationships` (real) | `relationship-actions`, NPC archetypes | `rel.stat`/`rel.flag`/`rel.type`; `addRelationship`/`removeRelationship` | `relationshipActions`, `takeRelationshipAction`           |
| Careers/Edu §4.5.3   | `career` (real)        | `careers`, `education`                 | (reuses existing)                                                        | `applyToJob`, `enroll`, `quitJob`, promote/fire on age-up |
| Assets §4.5.4        | `ownedAssets`          | `assets`                               | (reuses existing)                                                        | `buyAsset`, `sellAsset`, upkeep on age-up                 |
| Ribbons §4.5.5       | `ribbon` (final)       | `ribbons`                              | (reuses existing)                                                        | ribbon selection in `checkDeath`                          |

All new content types validate through the same Zod pipeline (§5.4) and live in the mod layout (§5.1). The crime/prison and fame "systems" BitLife advertises are **not** new engine concepts — they are content: crimes are actions, prison is a flag plus gated actions/events, fame is a declared stat. This is the test that the model is rich enough: the marquee BitLife systems fall out of the five primitives above without further engine work.

---

## 5. Mod System (the heart of the project)

### 5.1 Mod Package Layout

A mod is a folder/zip:

```
my-mod/
├── mod.yaml          # manifest: id, name, version, author, description, engineVersion, dependencies
├── content/
│   ├── definitions/*.yaml          # declared stats / custom first-class fields (§4.4)
│   ├── events/*.yaml               # pushed random events (§4.2)
│   ├── actions/*.yaml              # player-initiated Activities-menu actions (§4.5.1)
│   ├── relationship-actions/*.yaml # actions targeted at an NPC (§4.5.2)
│   ├── archetypes/*.yaml           # NPC templates for generated people (§4.5.2)
│   ├── careers/*.yaml              # job ladders (§4.5.3)
│   ├── education/*.yaml            # school/degree programs (§4.5.3)
│   ├── assets/*.yaml               # ownable asset types (§4.5.4)
│   ├── ribbons/*.yaml              # end-of-life summaries (§4.5.5)
│   └── strings/*.yaml
└── assets/              # optional images/icons (static, validated types only)
```

### 5.2 Manifest (`mod.yaml`)

```yaml
id: com.author.medieval-life # globally unique (reverse-DNS recommended)
name: Medieval Life
version: 1.2.0 # semver
engineVersion: '>=1.0.0 <2.0.0' # compatible engine range
author: Jane Doe
description: Adds a medieval era with knights, plagues, and royalty.
dependencies: [] # optional other mod ids + version ranges
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

**Condition operators:** `==, !=, >, >=, <, <=, in`. Targets: `stat` (reserved `age`), `flag`, `asset`, `random` (probability gates), and — within relationship-actions (§4.5.2) — `rel.stat`, `rel.flag`, `rel.type` scoped to the targeted NPC. Grouping via `any:` / `all:`.
**Effect operators:** `+, -, *, set, push, remove`. Targets: `stat`, `flag`, `asset`; `rel.stat`/`rel.flag` for the targeted NPC; `addRelationship`/`removeRelationship` to manage the NPC list; and `triggerEvent` for chains. Career/education/asset state is changed through the engine APIs in §4.5, not raw effects.

> Explicitly **out of scope for v1:** arbitrary expression formulas (e.g. `health - random(5,15)`) and any scripting. The declarative model covers ~95% of BitLife-style content and keeps mods safe and validatable. Expression support is a documented future extension behind a schema version bump.

### 5.4 Validation & Safety (critical — mods are untrusted input)

Every imported mod passes through `packages/mod-schema`:

1. **Parse** YAML → JSON.
2. **Zod schema validation** — reject anything malformed; produce human-readable errors.
3. **Reference integrity** — all referenced ids (careers, follow-up events, strings) resolve.
4. **Bounds/sanity** — stat deltas clamped; weights non-negative; no infinite trigger loops (cycle detection on `triggerEvent`).
5. **Asset whitelist** — only image/audio of allowed types & size; no executables, no scripts. Ever.
6. **Engine-version compatibility** check against manifest.

A mod that fails validation is **rejected with a clear report** and never loaded. Because mods are data only, there is no code execution surface — this is what keeps it App-Store-safe.

### 5.5 Conflict Resolution & Load Order

- Mods can be enabled/disabled individually.
- Each piece of content is namespaced by mod id.
- Deterministic load order (user-orderable list); later mods can **override** earlier content by id (documented), or **add** to it.
- Dependency resolution: a mod declaring dependencies won't enable until they're present and version-compatible.

---

## 6. Mod Distribution & Import (all four sources)

`packages/mod-loader/src/sources/`:

1. **GitHub repo/release link** (`github.ts`)
   - User pastes a GitHub URL (repo, or specific release).
   - Loader resolves to a downloadable archive: prefer **latest release asset (zip)**; fall back to repo tarball of default branch via GitHub's public archive endpoint (no auth needed for public repos).
   - Download → unzip in-memory/temp → validate → install. _(No `git` required; plain HTTPS fetch.)_
   - Caches the resolved version; supports "check for update."

2. **Direct file upload** (`fileUpload.ts`)
   - `expo-document-picker` to pick a `.yaml`, `.json`, or `.zip` from device. Same validate→install pipeline.

3. **Paste raw YAML/JSON** (`paste.ts`)
   - Text box; ideal for quick/small mods and authoring/testing. Parses, validates, installs.

4. **Curated in-app registry** (`registry.ts`)
   - A central **manifest repo** (just a JSON index file hosted on GitHub/CDN) listing approved mods with metadata + their GitHub source URLs.
   - App fetches the index, shows a browsable/searchable list, and "Install" routes through the GitHub source path above.
   - Curation = PRs to the manifest repo; keeps discovery quality high without hosting infrastructure.

All four funnel into one pipeline: **acquire → unpack → validate (§5.4) → store (filesystem) → register (local index) → enable.** Installed mods persist locally and load offline thereafter.

---

## 7. App / UI Surface (MVP target, post-spec)

- **Home / New Life:** start a life (optionally pick a scenario from enabled mods).
- **Main game screen:** character + stats header, scrollable life-history feed, big **Age Up** button, **Actions** menu (mod-defined activities), relationships/assets/career tabs.
- **Event modal:** title, choices, animated result text.
- **Mods screen:** installed list (enable/disable/reorder/remove), **+ Add Mod** (the four import sources), **Browse Registry**, per-mod detail + validation status.
- **Settings:** save management, seed display (for reproducible lives), about/credits.

Components live in `packages/ui`, are platform-agnostic (NativeWind), and render identically on native + web.

---

## 8. Open-Source & Contribution Posture

- **License:** permissive (MIT) for the engine/app to maximize contribution; mods carry their own licenses.
- `docs/MOD_AUTHORING.md` is the contributor entry point; ship `mods/sample-expansion/` as a copy-paste starting point.
- Generate a **JSON Schema** (`docs/mod-schema.json`) from the Zod schema so authors get autocomplete + inline validation in VS Code.
- The base game is `mods/core/` — proving the system and serving as the largest worked example.

---

## 9. Build Phases

**All phases (0–11) are complete** — implemented, committed, and verified green
(format, lint, typecheck, tests with coverage gates, web build smoke check).
Phases 0–7 built the foundation; phases 8–11 added the interaction systems of
§4.5 (actions, relationships, careers/education, assets, ribbons) that give the
game BitLife-level depth. The base game `mods/core` exercises every system.

1. ✅ **Phase 0 — Scaffold:** monorepo (pnpm + Turbo), TS strict, lint/format, CI with Vitest + coverage gates from day one (§11.3).
2. ✅ **Phase 1 — Schema + Engine core:** `mod-schema` (Zod) and `engine` (turn loop, conditions, outcomes, seeded RNG) with golden-life, unit, property-based, and adversarial tests (§11.1) — headless.
3. ✅ **Phase 2 — Core content mod:** `mods/core/` plays a full deterministic life to a natural death; `@fateline/mod-io` loads the on-disk YAML layout.
4. ✅ **Phase 3 — Mod test harness:** `packages/cli` `fateline-validate` (validation + headless seeded smoke test, §11.2), esbuild-bundled binary.
5. ✅ **Phase 4 — App UI:** `@fateline/store` (Zustand) + `@fateline/persistence` + `@fateline/ui`, wired into the `apps/mobile` Expo app (New Life / Play / Mods screens) with dynamic stat rendering; verified via `expo export --platform web`.
6. ✅ **Phase 5 — Mod loader:** `@fateline/mod-loader` — the four import sources + one install pipeline + Mods screen.
7. ✅ **Phase 6 — Registry + docs:** `registry/index.json` with a CI merge gate running `fateline-validate` (§11.2), `docs/MOD_AUTHORING.md`, `docs/ARCHITECTURE.md`, generated `docs/mod-schema.json`, `mods/sample-expansion/`, MIT `LICENSE`.
8. ✅ **Phase 7 — Hardening:** save migrations + autosave wired into the app, E2E smoke flow (`.maestro/new-life.yaml`), `docs/STORE_COMPLIANCE.md`.
9. ✅ **Phase 8 — Actions + Relationships (§4.5.1–2):** `actions` and `relationship-actions`/`archetypes` content types; `actionMemory` + real `relationships` in `GameState`; `availableActions`/`takeAction`, `relationshipActions`/`takeRelationshipAction`, NPC generation; `rel.*` targets + `addRelationship`/`removeRelationship`. ActionsMenu + RelationshipsPanel in the app.
10. ✅ **Phase 9 — Careers + Education (§4.5.3):** `careers`/`education` content types; real `career`/`education` state; `applyToJob`/`enroll`/`quitJob` + salary/promotion/tuition/graduation on age-up; CareerPanel.
11. ✅ **Phase 10 — Assets + Ribbons (§4.5.4–5):** `assets`/`ribbons` content types; `ownedAssets` + buy/sell/upkeep/revaluation; ribbon selection at death; AssetsPanel + end-of-life ribbon.
12. ✅ **Phase 11 — Content depth:** `mods/core/` fleshed out — activities across mind-body/social/money/crime, four careers gated by an education track, relationship interactions, crime/prison (as actions + flags), assets, and a ribbon set. Smoke-tested at 200 lives.

### As-built notes (deviations from the original plan)

- **One Expo app, not separate `apps/web` + `apps/mobile`.** Expo's web target covers the web build from the single `apps/mobile` codebase, so a second app would have been redundant.
- **The CLI harness was built in its own phase (3)** ahead of the UI, because mod quality gating is more foundational than screens.
- **`fateline-validate --with <dir>`** composes a base mod (core) before smoke-testing an expansion, since an expansion has no terminal condition on its own.
- **`mods/core` ships a generated `core.json`** (committed) so the app imports the base game as a bundlable object — React Native can't read YAML from disk at runtime. A test asserts it stays in sync with the YAML source.
- **NativeWind/Tailwind:** styling currently uses React Native `StyleSheet`; NativeWind can be layered on without changing component APIs.

---

## 10. Verification (how we'll know the spec's architecture holds up)

Because this task produces a document, "verification" means the spec is internally consistent and de-risks the hard parts. The architecture is validated against these acceptance checks for the eventual build:

- **Engine determinism:** a Vitest suite runs a fixed seed + scripted choices and asserts an exact resulting game state.
- **Schema rejects bad mods:** unit tests feed malformed/malicious YAML and assert clear rejection (no crash, no execution).
- **Dogfooding:** the base game runs entirely as a loaded mod — if `mods/core/` can express a full life, third-party mods can express anything comparable.
- **Cross-platform parity:** the same `packages/ui` screens render and the same engine produces identical state on iOS, Android, and web.
- **App Store safety:** no code path downloads or evaluates executable code; mods are data validated by Zod before use.

---

## 11. Testing Strategy

Two distinct testing problems, addressed separately. Because this is open-source and accepts untrusted mods from strangers, testing is a first-class concern, not an afterthought.

### 11.1 Testing our code (engine, schema, loader, UI)

| Layer                             | Tool                         | What it covers                                                                                                                                                                                                                         |
| --------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engine — golden life tests** ⭐ | Vitest                       | Fixed seed + scripted choices → assert the _exact_ final game state. Highest-value tests in the project; catch any unintended behavior change. Enabled by the seeded PRNG (§4.3).                                                      |
| **Engine — unit**                 | Vitest                       | Condition evaluator (every operator + `any`/`all` grouping), effect resolver, stat clamping, declared-field decay (§4.4), turn loop, death conditions.                                                                                 |
| **Engine — property-based**       | Vitest + fast-check          | Thousands of random seeds asserting invariants that must _always_ hold: stats stay in range, money never NaN, turn loop always terminates, a dead character can't age up. Finds emergent/mod-interaction bugs hand-written tests miss. |
| **Schema/loader — adversarial**   | Vitest                       | Malformed/malicious/pathological YAML → assert clean rejection, readable error, **no crash, no execution**: wrong types, unknown fields, negative weights, circular `triggerEvent`, oversized files, unresolved id references.         |
| **UI — component**                | React Native Testing Library | Screens render; the **dynamic stat rendering** case (a mod's declared stat bar appears with no code change, per §4.4).                                                                                                                 |
| **E2E**                           | Maestro                      | (Phase 6) start a life → age up → install a mod → play it.                                                                                                                                                                             |

**Fixtures are the real mods:** `mods/core/` and `mods/sample-expansion/` double as test fixtures, so the base game is part of the engine test suite — dogfooding again.

### 11.2 Testing community mods — the `fateline-validate` harness ⭐

`packages/cli` ships a CLI (`fateline-validate <mod-path>`) that runs:

1. **Schema + safety validation** — the full §5.4 pipeline (Zod, reference integrity, bounds, cycle detection, asset whitelist, engine-version check).
2. **Headless seeded smoke test** — runs _N_ seeded lives with the mod enabled and asserts: no crash, no stuck/unwinnable states, stats stay bounded, turn loop terminates. Reuses the pure `engine` package — no app required.

This harness is used in two places:

- **Authors run it locally** before submitting — instant feedback, no app, no device.
- **The curated registry repo runs it in CI** on every PR. **A mod cannot merge into the registry unless it passes validation + the smoke test.** This is how the project scales community contributions with near-zero manual review.

### 11.3 CI & coverage policy

- **Our CI (GitHub Actions):** lint + typecheck + Vitest + build on every push/PR, across the workspace.
- **Coverage gate (decided): strict on core, relaxed on UI.** Enforce a high threshold (≈90%) on `packages/engine` and `packages/mod-schema` — the trust-critical, pure-logic packages where bugs are costly and tests are cheap. No hard percentage gate on `ui`/`apps` (tested by judgment via component tests), to avoid pressuring contributors into low-value UI-glue tests.

---

## Deliverable for this task

This specification document. No source files are created. On approval, implementation proceeds per the phased roadmap (§9), starting with the monorepo scaffold and the pure engine + schema packages.
