---
description: Run typecheck and format, then commit and push changes
---

Run the following steps in order:

1. Run `bun run typecheck` to check for TypeScript errors
2. Run `bun run format` to format the code
3. Review the git status and changes with `git status` and `git diff`
4. Commit all changes with an appropriate commit message following the existing commit style
5. Push the changes to the remote repository

If typecheck fails, stop and report the errors. If format makes changes, include them in the commit.
