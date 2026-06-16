# Writing a Fateline Mod

A **mod** is a content pack — pure data, no code — that the app loads and
the engine interprets. This is what keeps mods safe and lets them run on
iOS, Android, and web (README §1, §5). The base game itself is a mod
(`mods/core`), so anything it does, your mod can do too.

## Layout

```
my-mod/
├── mod.yaml                 # manifest (required)
└── content/
    ├── definitions/*.yaml       # declared stats
    └── events/*.yaml            # events
```

A content file may contain a single item, a YAML array of items, or an object
keyed by the content type (e.g. `stats:`); all three are accepted.

## Manifest (`mod.yaml`)

```yaml
id: com.yourname.my-mod # reverse-DNS, globally unique
name: My Mod
version: 1.0.0 # semver
engineVersion: '>=0.0.0 <1.0.0' # compatible engine range
author: Your Name
description: One or two sentences about what it adds.
dependencies: [] # optional: [{ id: com.other.mod, version: ">=1.0.0" }]
```

## Stats vs. flags — which to use

- **Flag** — an ad-hoc variable you just need to remember. Set it from an
  effect; it is not shown, clamped, or decayed. Prefix flag names with your
  mod id (`com.yourname.my-mod/has_pet`) to avoid clashes.
- **Declared stat** — a first-class value that should appear in the UI, be
  clamped to a range, optionally drift each year, and be referenceable by other
  mods. Declare it in `content/definitions/stats.yaml`:

```yaml
stats:
  - id: karma
    label: 'Karma'
    min: -100
    max: 100
    default: 0
    showInUI: true
    yearlyDelta: 0 # optional passive drift each age-up
    exposeAs: karma # optional: publish a stable global name for interop
```

Without `exposeAs`, your stat is namespaced (`com.yourname.my-mod.karma`)
and private to your mod. With it, other mods can read/write `karma`.

## Events

```yaml
- id: evt.found-wallet # "kind.name"
  category: random
  weight: 10 # selection weight among eligible events
  cooldownYears: 5 # optional: minimum years before refiring
  once: false # optional: fire at most once per life
  conditions: # ALL must hold (use any:/all: to group)
    - { stat: age, op: '>=', value: 6 }
    - { flag: in_jail, op: '==', value: false }
  title: 'You found a wallet on the sidewalk.'
  choices:
    - text: 'Keep the money'
      outcomes: # one is picked by weight
        - weight: 70
          effects:
            - { asset: money, op: '+', value: 200 }
            - { stat: happiness, op: '+', value: 5 }
          resultText: 'You pocketed $200.'
        - weight: 30
          effects:
            - { flag: criminal_record, op: 'set', value: true }
          resultText: 'Someone saw you.'
```

**Condition targets:** `stat` (the reserved id `age` reads the character's
age), `flag`, `asset`, and `random: true` (a fresh 0–1 draw).
**Condition operators:** `== != > >= < <= in`.
**Effect targets:** `stat`/`asset` (`+ - * set`), `flag` (`set`, or `push`/
`remove` for list flags), and `triggerEvent` to chain a follow-up.

> **Tip — trigger-only events:** give an event an impossible condition (e.g.
> `{ flag: never, op: '==', value: true }`) so it is never randomly selected;
> it can still be reached via `triggerEvent`, which bypasses conditions.

## Validate before you publish

```
fateline-validate path/to/my-mod --with mods/core
```

This runs full schema/safety validation and a headless smoke test (many seeded
lives) to catch crashes, unwinnable states, and out-of-bounds stats. Pass
`--with mods/core` so your expansion is tested alongside the base game.

## Share it

1. Push your mod to a public GitHub repo (`mod.yaml` at the root).
2. Players can install it immediately by pasting the repo URL in the app, or
   uploading/pasting the files.
3. For discovery, open a PR to [`registry/index.json`](../registry/index.json);
   CI re-runs `fateline-validate` as a merge gate.

Editor autocomplete: point your YAML tooling at
[`docs/mod-schema.json`](./mod-schema.json) (generated from the engine's
own schema).
