# Fateline Module Registry

`index.json` is the curated list of community modules the app can browse and
install (README §6, source 4). It is just a JSON index — there is no hosting
infrastructure; the app fetches this file and installs each entry from its
GitHub `source`.

## Adding your module

1. Publish your module to a public GitHub repo (a `module.yaml` at the repo
   root, plus `content/`). See [`docs/MODULE_AUTHORING.md`](../docs/MODULE_AUTHORING.md).
2. Validate it locally:
   ```
   fateline-validate path/to/your-module --with modules/core
   ```
3. Open a PR adding an entry to `index.json`:
   ```json
   {
     "id": "com.yourname.your-module",
     "name": "Your Module",
     "description": "One line about what it adds.",
     "author": "Your Name",
     "source": "https://github.com/yourname/your-module"
   }
   ```

## The merge gate

CI runs `fateline-validate` against every module referenced by `index.json`
(composed with the core module). A module that fails schema validation or the
headless smoke test cannot be merged (README §11.2) — this keeps the registry
high-quality without manual review.
