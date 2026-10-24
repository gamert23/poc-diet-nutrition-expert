# LINE LIFF Diet & Nutrition Expert

A LINE LIFF app that works as a personal AI nutritionist: a calorie goal engine, an AI food photo scanner with hypertension and diabetes alerts, fridge-to-recipe, a daily or weekly meal planner, and a LINE daily summary at 20:00. The source spec is `liff_diet_nutrition_expert_software_requirements_document.md`.

Stack: Next.js 16 (App Router), Tailwind CSS 4, LIFF SDK v2, Supabase (Postgres + Storage), LINE Messaging API, and OpenAI GPT-4o.

## Requirement coverage

| SRD | Where |
| --- | --- |
| FR-1.1 / FR-1.2 onboarding, BMR/TDEE, deficit with 1500/1200 floor, 30/45/25 macros | `src/app/onboarding`, `src/lib/nutrition.ts`, `PUT /api/profile` |
| FR-2.1 / FR-2.2 food photo analysis | `src/app/scan`, `POST /api/scan` (SRD prompt 6.1 in `src/lib/prompts.ts`) |
| FR-2.3 sodium > 600 mg (hypertension) and sugar > 10 g (diabetes) alerts | `src/lib/safety.ts`, applied server-side on scan, recipe, and every saved meal |
| FR-3.1 fridge photo or quick-select chips or typed ingredients | `src/app/fridge`, `POST /api/fridge/ingredients` |
| FR-3.2 recipe using remaining calories, conditions, and equipment | `POST /api/fridge/recipe` (SRD prompt 6.2) |
| FR-4.1 / FR-4.2 daily or 7-day plan, 3 meals + snack, budget and seasoning control | `src/app/planner`, `/api/meal-plans` |
| FR-5.1 rich menu: Dashboard, AI Scanner, Fridge AI, AI Chat | `scripts/setup-rich-menu.mjs`; AI Chat is answered in the LINE chat by `POST /api/line/webhook` |
| FR-5.2 20:00 Flex summary with calorie and macro progress bars | `src/lib/flex.ts`, `GET /api/cron/daily-summary`, `vercel.json` cron `0 13 * * *` (13:00 UTC = 20:00 ICT) |

Phase 2 items (SRD section 8) are out of scope.

## Design decisions

- **Auth**: the client sends the LIFF ID token, and the server verifies it with LINE (`/oauth2/v2.1/verify`) before doing anything. All database access goes through route handlers using the Supabase service role. RLS is enabled with no policies, so the anon key can read nothing.
- **Warning flags are computed, not trusted**: the AI's own `warning_flags` are ignored. Flags are recomputed from the returned sodium and sugar values and the user's recorded conditions, per FR-2.3. The limits are used exactly as written in the SRD; there is no clinical review.
- **Schema additions** to SRD section 4: `profiles.cooking_equipment` (FR-3.2), `profiles.daily_budget_thb` and `meal_plans.estimated_cost_thb` (FR-4.2), `profiles.daily_summary_enabled` (opt-out for FR-5.2), plus indexes and an `updated_at` trigger.
- **Photos** go to a private `food-photos` bucket. The dashboard shows them through 1-hour signed URLs. Images are downscaled to 1280px on the device before upload.
- **"Today"** always means the Asia/Bangkok calendar day.

## Setup

1. `npm install`
2. Supabase: run `supabase/migrations/20261024000000_init.sql` (either `supabase db push` or paste it into the SQL editor). It also creates the storage bucket.
3. LINE Developers:
   - A **LINE Login** channel with a LIFF app (size Full, scopes `openid` + `profile`), endpoint URL = your deployed root URL.
   - A **Messaging API** channel linked to the same provider. Webhook URL = `https://<host>/api/line/webhook`, with webhooks enabled.
4. `cp .env.example .env.local` and fill it in.
5. Rich menu: create a 2500x843 image with four equal columns (Dashboard, AI Scanner, Fridge AI, AI Chat), then run `npm run richmenu:setup -- path/to/image.png`.
6. Deploy to Vercel and set the same env vars there, including `CRON_SECRET`.

### Local development outside LINE

Set `ALLOW_DEV_AUTH=true` and `NEXT_PUBLIC_DEV_LINE_USER_ID=<any id>` in `.env.local`. The client then skips LIFF and the server trusts the `x-dev-line-user-id` header. This bypass is disabled whenever `NODE_ENV=production`.

```bash
npm run dev        # http://localhost:3000
npm test           # unit tests (vitest)
npm run typecheck
npm run build
```
