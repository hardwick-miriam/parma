# Morning TODO

## Your one step for voice logging
Add `GROQ_API_KEY` to Vercel environment variables → redeploy.

Voice works immediately after that. The Web Speech API (on-device, free) is already wired as fallback if Groq is unavailable.

---

## Task 11 — WHOOP 15-minute sync
See SYNC.md for the cron-job.org setup.

### Confirming webhook registration in WHOOP dashboard
1. Go to developer.whoop.com → your app → Webhooks
2. Verify the webhook URL is set to: `https://parma-seven.vercel.app/api/whoop/webhook`
3. Events to register: `workout.updated`, `sleep.updated`, `recovery.updated`, `cycle.updated`
4. Signature secret: copy `WHOOP_WEBHOOK_SECRET` from Vercel env vars and paste it here
5. Test the webhook — WHOOP sends a test event; check Vercel function logs for confirmation

---

## MORNING.md will be updated by Task 13 with pass/fail results
