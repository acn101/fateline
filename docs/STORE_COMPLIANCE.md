# App Store Compliance Review

The defining constraint of Fateline's design is that it must pass Apple App
Store review while letting anyone add modules (README §1, §5.4). This is a
checklist of why the architecture is compliant and what to keep that way.

## Why it's compliant

- **Modules are data, never code.** Every module is YAML/JSON validated by Zod
  (`@fateline/module-schema`) and interpreted by the app-shipped engine. No code
  path downloads or evaluates executable JavaScript, native code, or scripts.
  This is the rule that keeps the dynamic, GitHub-installable module system
  within Apple Guideline 2.5.2 (no downloading/executing code that changes the
  app's features or functionality).
- **The interpreter ships in the binary.** `@fateline/engine` is fully present
  at build time. Installing a module only adds _content_ the existing
  interpreter already knows how to read.
- **Validation before use.** `validateModule` runs schema + reference-integrity
  - trigger-cycle checks; invalid or malicious data is rejected, never run.
- **No remote code in OTA terms.** There is no eval, no `Function()` from
  network input, no remote bundle loading.

## Invariants to preserve (do not regress)

1. Never add an effect/condition type that executes a string as code or formula
   beyond the declarative vocabulary (the README §5.3 "out of scope" note).
2. Module assets must stay a static whitelist (images/audio with type+size
   checks); never accept executables or scripts.
3. Any future "scripting" must be sandboxed and gated behind a review of this
   document — and is currently explicitly out of scope.
4. Keep user-generated text moderation in mind for the registry (handled by the
   PR-based curation + CI gate, not in-app).

## Pre-submission checklist

- [ ] `pnpm test` green (engine determinism + adversarial schema tests pass).
- [ ] `fateline-validate` rejects a module containing an unknown/script-like
      field (covered by schema adversarial tests).
- [ ] No new dependency introduces `eval`/remote-code execution.
- [ ] Privacy: saves are local (`@fateline/persistence`); no PII leaves device.
- [ ] E2E smoke flow (`.maestro/new-life.yaml`) passes on a device.
