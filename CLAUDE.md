@AGENTS.md

# Bradford Seamless Gutters V2

All-in-one, mobile-first business app for Bradford Seamless Gutters in Ocala, FL. Owner-only for now. V1 is not available, so this is a full rebuild.

Update this file whenever a decision, the schema, or the status changes.

## Status

- **Phase 0, Foundation:** code built locally. Supabase and Vercel are not connected yet.
- **Next:** connect Supabase and Vercel, then Phase 1.
- **Side project, material calculator:** price list parsing is done and waiting for owner review. It lives in `calculator/`; see `calculator/CALCULATOR_BRAIN.md`. It will become the Phase 2 pricing engine.

## Stack

- Next.js 16 App Router and TypeScript, styled with Tailwind 4. Next.js 16 uses `proxy.ts`, not `middleware.ts`.
- Supabase for Postgres, auth and photo storage.
- Vercel for hosting and scheduled jobs.
- Planned: Resend for email, Twilio for text, Stripe payment links for card payments and deposits.

## Commands

On Windows PowerShell, use `npm.cmd` and `npx.cmd`.

- `npm.cmd run dev`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run catalog`: rebuilds `calculator/output/` from the price list transcriptions

## Auth

- Email and password through Supabase, with public signups turned off.
- `proxy.ts` redirects signed-out visitors and refreshes the session. `q/` is excluded so customers can open quote links.
- `requireUser()` checks again in the app layout. Layouts don't rerun on client navigation, so every table needs row level security and every server action must check the user.
- Cache Components and Partial Prefetching are off. Every page is private and live, and they fail the build when the app layout reads cookies.
- Preview mode shows the app locally when Supabase keys are missing. Production builds with missing keys stay locked.

## Project layout

- `app/(app)/`: signed-in pages. `[module]/page.tsx` is the placeholder until a module gets its own folder.
- `app/(auth)/login/`: sign-in.
- `app/q/[token]/`: customer quote page (Phase 3).
- `lib/modules.ts`: navigation and module list.
- `lib/supabase/`: Supabase clients and session handling.
- Planned: `lib/pricing/` with tests, `lib/pdf/`, `lib/messaging/`, `supabase/` for migrations and seed data.

## Business decisions

- **Services:** seamless gutter install, cleaning, repairs, guards.
- **Gutter product:** one type is sold. Every quote has two options, white coil and colored coil. There is no good/better/best.
- **Pricing:** materials plus crew-day labor plus markup. Contractors have separate rates.
- **Locked prices:** a sent quote keeps copies of its prices. Price changes only affect future quotes.
- **Rate or total:** invoices can be set by rate or by job total, because some prices are set first and the rate worked backwards (42 ft at $11.07 was billed as $465.00).
- **Measuring:** on site, or supplied by the contractor.
- **Acceptance:** customers view a link or PDF and accept by phone or text. The owner marks the quote accepted and records the chosen option. No e-signature.
- **Invoices:** two layouts. Contractor invoices have separate bill-to and job site. Homeowner invoices have cash and check lines plus signatures.
- **Payments:** cash, check, card link, deposits. Deposits attach to the job and carry over to the invoice.
- **Tax:** no tax line, with a setting that is off by default.
- **Leads:** referrals, contractors, Google or website.
- **Outreach:** the app drafts and queues messages. Nothing sends until the owner approves it.
- **Consent:** imported customers start as not opted in to texts. Campaign emails always include an unsubscribe link. Homeowners on contractor jobs are excluded from campaigns by default.
- **Old data:** PDFs and spreadsheets, imported in Phase 1.

## Planned schema

No tables exist yet. Every table gets row level security.

- `customers`, `properties`, `photos`
- `materials`, `rate_cards`, `rate_card_items`, `settings`
- `leads`, `quotes`, `quote_options`, `quote_lines`
- `jobs`, `job_materials`
- `invoices`, `invoice_lines`, `payments`
- `cleaning_plans`, `campaigns`, `message_templates`, `messages`

## Build order

0. Foundation
1. Customers and properties, plus import
2. Materials and rate cards
3. Quotes
4. Jobs and calendar
5. Invoices and payments
6. Leads and email follow-up
7. Dashboard
8. Text messages, after carrier registration

## Open questions

Needed before Phase 3:

- Current material prices, crew day rate and markup.
- What contractor rates change: markup, labor or material prices.
- How deposits are sized and whether every job takes one.
- How materials are estimated from footage, such as hanger spacing and downspouts.

## Later

SMS intake with Claude handling first replies, sketch tool measurements in quotes, customer portal, expense tracking, white-labeling.
