# /wrap-up — End of Session Sync

Run this at the end of every session to keep STATUS.md, CLAUDE.md, and memory in sync with what actually changed.

## Steps

### 1. Scan what changed this session

Check the git log since the last recorded update to understand what was built:

```bash
git log --oneline -20
```

For each touched area, read the relevant files to confirm implementation is complete (don't trust the commit message alone — check the code).

Key files to verify:
- `apps/api/src/routes/` — which routes exist, what they do
- `apps/client/app/(dashboard)/` — which pages/modals/features are present
- `apps/client/middleware.ts` — public route exemptions
- `services/` — which services have real implementation vs skeleton

### 2. Update STATUS.md

Read the current `STATUS.md`, then rewrite it with accurate state:

**Rules:**
- Move completed items from ⚠️ or ❌ into ✅ — only if you've confirmed the code is actually there
- Add newly shipped features to ✅ with a concise description
- Remove action items from "Known Missing Wiring" if they're done
- Update the "Last updated" date at the top to today's date
- Keep env var tables accurate — add any new vars that were added this session
- Be precise: "built but untested in prod" vs "fully working end-to-end" are different things

### 3. Update CLAUDE.md

Read the current `CLAUDE.md`, then update only the parts that changed:

**What to update:**
- Agent descriptions if any new routes/pages were added that the agents should know about
- External APIs table if any API integration changed (e.g. from proxied-service to inline)
- Anything in the "Critical Notes" that's now out of date
- Do NOT rewrite sections that are still accurate — surgical edits only

### 4. Update memory

Read `C:\Users\jason\.claude\projects\c--Users-jason-OneDrive-Documents-claudecode-projects-growth-os\memory\MEMORY.md` and the individual memory files. Update any that are stale based on what was built this session. Common memory files to check:
- `project_*.md` files — any in-progress work that is now complete
- `user_*.md` files — any new preferences revealed this session

### 5. Commit

Stage and commit the doc updates:

```bash
git add STATUS.md CLAUDE.md
git commit -m "docs: sync STATUS.md and CLAUDE.md post-session"
git push
```

If memory files changed, note that in the commit message but don't stage them (they're outside the repo).

---

## What Good Output Looks Like

- STATUS.md "Last updated" reflects today
- Every feature built this session is in the ✅ list
- No completed items remain in ⚠️ or ❌
- Action items table only shows genuinely missing things
- CLAUDE.md agent descriptions are accurate
- Commit is pushed
