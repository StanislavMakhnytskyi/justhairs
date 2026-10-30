---
name: review-pr
description: Review a pull request with the project's code-reviewer (and design/migration reviewers when relevant). Argument: PR number or URL; defaults to the current branch's PR.
---

1. Resolve the PR: `$ARGUMENTS`, else `gh pr view --json number,title,headRefName,url`.
2. Get the diff and file list: `gh pr diff <n>` / `gh pr view <n> --json files`.
3. Run the `code-reviewer` agent on it. If `supabase/migrations/**` is in the file list, also run `migration-reviewer`. If `src/components/**` or `src/app/**/*.tsx` changed, run `design-reviewer` against a preview/dev URL when one is available.
4. Check CI with `gh pr checks <n>` and explain any red check by reading its log (`gh run view <id> --log-failed`) — separate code failures from infrastructure ones (e.g. missing Actions secrets).
5. Report findings ranked by severity. Do not post comments or approve/merge on GitHub unless the user asks.
