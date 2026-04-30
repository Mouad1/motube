# Git hooks (motube)

Checked-in hooks. Activate once per clone:

```bash
git config core.hooksPath .githooks
```

## `pre-push`

Blocks direct pushes to `main` / `master`. Always work on a feature branch and open a PR.

Override (only for emergencies):

```bash
git push --no-verify
```
