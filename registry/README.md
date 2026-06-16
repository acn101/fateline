# Fateline Mod Registry

`index.json` is the curated list of community mods the app can browse and
install (README §6, source 4). It is just a JSON index — there is no hosting
infrastructure; the app fetches this file and installs each entry from its
GitHub `source`.

## Adding your mod

1. Publish your mod to a public GitHub repo (a `mod.yaml` at the repo
   root, plus `content/`). See [`docs/MOD_AUTHORING.md`](../docs/MOD_AUTHORING.md).
2. Validate it locally:
   ```
   fateline-validate path/to/your-mod --with mods/core
   ```
3. Open a PR adding an entry to `index.json`:
   ```json
   {
     "id": "com.yourname.your-mod",
     "name": "Your Mod",
     "description": "One line about what it adds.",
     "author": "Your Name",
     "source": "https://github.com/yourname/your-mod"
   }
   ```

## The merge gate

CI runs `fateline-validate` against every mod referenced by `index.json`
(composed with the core mod). A mod that fails schema validation or the
headless smoke test cannot be merged (README §11.2) — this keeps the registry
high-quality without manual review.
