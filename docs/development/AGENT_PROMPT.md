# AGENT_PROMPT — per-session feature-doc author

> **Two agent roles, one feature at a time:**
>
> 1. **Author** (this file) → writes the `features/<id>.md` _plan_.
> 2. **Implement** ([IMPLEMENT_PROMPT.md](IMPLEMENT_PROMPT.md)) → builds the _code_ from that plan.
>    Run them as separate sessions. This file is the AUTHOR role.
>
> Paste the block below to a fresh agent to document ONE feature. Replace `F-XXXX` with the
> feature ID (see the **NEXT** row in [PROGRESS.md](PROGRESS.md)). One feature per session keeps
> context tight — good for token cost and planning quality.

---

You are documenting **ONE feature this session: `F-XXXX`**. You write a **planning doc**, not
application code. A later agent implements. Work only inside `docs/development/`.

**Read first, in this order (keep it tight — do NOT read the whole repo):**

1. `migti_backend/docs/development/PROGRESS.md` — project state, prior decisions, what's next.
2. `migti_backend/CLAUDE.md` — conventions + known caveats.
3. `migti_backend/docs/development/MASTER.md` — read **§1A decisions D1–D26 in full** (authoritative;
   they override any code you see), plus the **`F-XXXX` row in §5** and its **relationships in §6**.
   Skim the rest.
4. `migti_backend/docs/development/features/F-SETTINGS.md` and its frontend twin — the **template**.
   Match its structure and depth exactly.

**Hard rules:**

- MASTER.md is **byte-identical** on backend and frontend (`diff -q` must stay clean). Any MASTER
  edit updates BOTH copies.
- Feature IDs are shared. Write `features/F-XXXX.md` on **both** sides — backend-leaning
  (schema / endpoints / service / migration) and frontend-leaning (views / services / API-wiring) —
  with a shared requirements+relationships header, cross-linking each other.
- **Frontend visual design stays as-is** — feature = API integration, not redesign (unless the
  feature strictly needs a new screen; then note it).
- Respect the decisions, especially: **D19** (no branch concept), **D20** (RBAC is UI-side),
  **D9/D10** (variant combination IS the product, keyed by a stable code that never changes),
  **D1** (sales/purchase order rename). **Reuse existing helpers/components — don't invent.**
- **Ground every claim:** before writing, read the ACTUAL current models/services/routes (backend)
  and views/services/endpoints (frontend) for `F-XXXX`. State verified-current-state → gaps →
  target, exactly like F-SETTINGS.

**Do this:**

1. Give the product owner a 3-line summary of `F-XXXX` as you understand it + your key open questions.
2. **Ask** the business specifics you can't safely infer (schema choices, statuses, edge cases).
   Do NOT guess business logic. Use the answers.
3. Write both `features/F-XXXX.md` files (mirror F-SETTINGS's sections: Why → Verified current
   state → Target design → statuses → relationships → migration → files to reuse → status
   checkboxes → open sub-items).
4. Update MASTER (both copies): set the `F-XXXX` registry row to `[~]`; if a clarification is
   global, add it to §1A as a new `Dxx` decision + a §10 change-log line. Keep the copies identical.
5. Update `PROGRESS.md`: mark `F-XXXX` ✅, note any new decisions, set the next feature.
6. **Stop.** Do not start another feature.

**Constraints:** No application code — only `docs/development/`. If you need to inspect the DB or
the live UI, put temp scripts in a scratchpad (NOT the repo) and clean them up. Backend `:7200`,
frontend `:3000`; HOD login `migti.indore.hod@gmail.com` / `HodMigti@2341`. Ask when ambiguous
rather than assuming.

---

## Variants (optional, tune per session)

- **Faster / fewer questions:** change step 2 to _"propose the specifics with your recommendation,
  and ask only where a business rule is genuinely ambiguous."_
- **Batch a tightly-coupled pair** (e.g. F-SALES-ORDER + F-PO rename together): name both IDs and
  say _"document these two together as they share the D1 rename."_
