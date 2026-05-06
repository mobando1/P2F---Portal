# Evals — AI quality regression suite

Run before merging any change to a prompt or to the AI summary pipeline:

```
npm run eval-ai
```

This loads every `evals/gold/*.json`, generates a summary with the current
prompt + model, and scores it against the human-written ideal using three
metrics:

- **schema** — does the output validate against the zod schema? (binary)
- **rouge-l** — token overlap between generated headline and ideal headline
- **llm-judge** — Claude Haiku 4.5 reads transcript + generated summary and
  rates faithfulness 1-10

A run summary is printed and persisted to `evals/runs/<timestamp>.json`. The
CLI exits with code 1 if the average judge score drops more than 1 point vs
the previous run, so this can be wired into CI.

## Adding a new gold

1. Create `evals/gold/<slug>.json` matching the shape in `evals/lib/types.ts`.
2. Write the `expected` block by hand — that's the entire point. Synthetic
   "ideal" outputs aren't useful; what matters is what a senior tutor would
   write.
3. Run `npm run eval-ai` to verify the new gold loads and scores.

## Versioning prompts

Prompts live in `evals/prompts/post-class-summary-v{N}.md`. Bump the version
when you change anything substantive. The active version used by production
code is named in `server/services/ai/prompts.ts` (added in a later step).

## What this is NOT

This isn't a benchmark suite. The 5 starter golds are illustrative — they
exist so the pipeline runs end-to-end before we have real classes. Replace
them with real transcripts as soon as you have signed consent on a few
classes (3-5 per CEFR level is plenty).
