# Runbooks — P2F Portal

Operational playbooks for incidents and routine tasks. Read top-to-bottom when something is on fire — these are written as numbered steps you can follow at 2 AM.

Update this file whenever you fix a class of incident a second time. If you needed it once, you'll need it again, and the future you (or whoever inherits the project) will thank you.

---

## Where to look first when something is wrong

| Symptom | First place to check |
|---|---|
| "It's down" / nothing loads | `https://portal.passport2fluency.com/api/health` |
| Specific user report | Sentry → Issues, filter by user email |
| Errors in browser | Sentry → `p2f-frontend` → Issues |
| Errors on backend | Sentry → `p2f-backend` → Issues |
| Slow API | Railway → Metrics → CPU / RAM / response time |
| Timeouts | `/api/health`'s `db.latencyMs` field |
| Cron not firing | Railway logs, search for `[attendance-cron]` |
| AI runaway spend | Admin panel → AI Cost tab |

---

## The app is down (Better Stack alert fired)

1. Open `https://portal.passport2fluency.com/api/health` in browser.
   - If it returns JSON with `status: "ok"`: false alarm, monitor flapping. Check Better Stack regions — sometimes one region has an outage.
   - If it returns 503: see step 2.
   - If it doesn't load at all: see step 3.

2. **503 — process up but DB down.** Open Railway → Postgres service → check status.
   - If Postgres is restarting: wait 2-3 min, recheck health.
   - If Postgres is dead: contact Railway support; in parallel, post status in #status (or Slack).
   - If `dbLatencyMs` >5000ms: connection pool may be saturated. Restart the backend service in Railway (Service → Deployments → `⋮` → Restart) — usually clears the pool.

3. **Total no response.** Railway service is down.
   - Railway → service → Deployments. Look at most recent deploy: did it fail? If yes, click logs, fix the error in code, push.
   - If most recent deploy succeeded but service is dead: click `⋮` → Restart.
   - If restart doesn't help: roll back. Click prior successful deploy → Redeploy.

4. After resolving: post in status / notify users if outage was >5 min.

---

## AI cost spike (admin email "AI daily budget reached" fired)

1. Open admin panel → **AI Cost** tab.
2. Look at "By feature" (24h) — which feature burnt the budget?
3. Look at "Top users (24h)" — is it concentrated on a single user (likely abuse) or distributed (bug or normal growth)?

### If concentrated on one user (>50% of spend)
- Likely prompt injection / abuse / loop in their session.
- Check Sentry filtered by that userId for unusual error patterns.
- If admin: temporarily set their per-user cap by adding `userOverrides` exclusion or block via admin tools.
- Email the user asking what happened.

### If distributed across many users
- Likely a code bug introducing retries or oversized prompts.
- Check most recent deploy — did anything change in AI calls?
- If yes: roll back via Railway.
- If no: spot-check 3-5 recent rows of `ai_usage` table — are token counts unusually high?

### Manual reset of daily lock
The block clears automatically at midnight UTC. To unlock manually:
1. Bump `AI_DAILY_BUDGET_USD` in Railway env vars (e.g. from 10 to 50).
2. Redeploy.
3. Bump it back down once the spike is resolved.

---

## A class won't end / never goes to "completed"

Symptoms: class stays `status='scheduled'` long after `scheduled_at + duration` has passed.

1. Open admin → check if class is in `pending_tutor` or `pending_student` confirmation status.
   - If yes: working as designed. Tutor or student needs to confirm via the in-app banner. The cron auto-resolves after 24h (tutor) or 48h (student) of silence.
2. If `confirmation_status IS NULL` and class ended >15 min ago: the attendance cron should have caught it. Check Railway logs for `[attendance-cron]` line at the most recent 15-min mark.
   - If logs say "started" but no sweep activity: DB query may be erroring. Check Sentry.
   - If no `[attendance-cron]` at all: the server probably restarted recently and the next sweep is still pending. Wait 15 min.
3. To force-resolve a single class manually (admin only, via DB):
   ```sql
   UPDATE classes SET status='completed', confirmation_status='confirmed' WHERE id = X;
   -- or if it should refund:
   UPDATE classes SET status='cancelled', confirmation_status='no_show_refunded' WHERE id = X;
   UPDATE users SET class_credits = class_credits + 1 WHERE id = (SELECT user_id FROM classes WHERE id = X);
   ```
4. **Do not** run bulk updates without verifying `WHERE` clause — credits affect billing.

---

## A user reports "I booked but my credits didn't go down"

Verified bug pattern fixed in commit `b45769e`. If reported again:

1. Confirm the booking actually persisted: check `classes` table for a row with that user + recent `created_at`.
2. If row exists: credits did decrement in DB. The frontend just isn't refetching. Tell user to hard-refresh (Cmd+Shift+R).
3. If still wrong after hard refresh: check `/api/auth/me` response in DevTools Network tab — does it return the updated `classCredits`?
   - If yes: frontend caching bug, repro and file Sentry.
   - If no: backend is returning stale data. Check Railway logs around the booking timestamp.

---

## Sentry stops receiving events

1. Verify `/api/health` returns `sentry: "enabled"`.
2. If "disabled": `SENTRY_DSN` env var got removed/typo'd. Check Railway → Variables.
3. If "enabled" but no events: try the test endpoint:
   ```
   POST /api/admin/observability/test-error  (admin auth required)
   ```
   It should generate an issue within 60s. If not: Sentry quota exhausted (5K events/mo on free) or DSN moved.
4. Frontend equivalent: open `/api/config/public` and confirm `sentryDsn` is non-null.

---

## Better Stack uptime monitor flapping

Alerts firing every few minutes then resolving:

1. Check Railway service uptime — if process restarts every N minutes, something's killing it. Look at logs for OOM or unhandled rejections.
2. Check check frequency — 1-minute checks are too aggressive for free tier shared infra; bump to 3 minutes.
3. Add multi-region check — if one Better Stack region has flaky network it can give false positives. Configure to alert only when 2+ regions fail.

---

## Feature flag rollback

Something just shipped behind a flag and is misbehaving:

1. Admin panel → **Flags** tab.
2. Find the flag, **toggle Enabled OFF**.
3. Within 60s the cache invalidates and the feature disappears for everyone.

If the flag isn't visible (typo, never created): set `rolloutPercentage` to 0 anyway — defensive shut-off.

---

## Routine: rotating an exposed secret

If a Sentry DSN, Stripe key, or any secret leaks (screenshot in public, accidentally committed, etc):

1. Generate a new credential at the provider.
2. Update Railway env var with the new value.
3. Redeploy (Railway does this automatically when a var changes).
4. Revoke the old credential at the provider.
5. Audit logs for the day to spot any abuse during the exposure window.

---

## Routine: backup verification

Railway Postgres has automatic daily backups but they're useless if you've never restored one. Once a quarter:

1. Spin up a temporary Railway Postgres alongside production.
2. Pick a 7-day-old backup, restore into the temp instance.
3. Run a few `SELECT COUNT(*)` queries to confirm core tables (users, classes, ai_usage) have expected row counts.
4. Tear down the temp instance.

If this fails, file a P0 with Railway. **Do not** keep operating without verified backups.

---

## Routine: deploy validation (manual smoke test after big merges)

Before celebrating a release with significant changes:

1. `/api/health` returns 200, fields all present.
2. Login as admin works.
3. Login as student works.
4. Book a class (or cancel a test booking).
5. Open `/admin/ai-cost` — page renders without error.
6. Open Sentry → check no new issues spiked since deploy.
7. Check Better Stack → still green.

---

## Adding a new runbook

When you encounter an incident type not in this file:
1. Write down the steps you took to fix it WHILE you fix it (screenshots, commands, queries).
2. Add a new section here following the same pattern (symptom, diagnosis, fix, manual recovery).
3. Commit. Don't worry about polishing — it's better to have a rough runbook than none.
