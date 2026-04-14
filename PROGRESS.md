# Akuru Type CMS — Progress & Structure

> **Living document.** Updated at the end of every session to reflect the current state of the product.
> Last updated: April 2026 (Session 3)

---

## What This App Is

A **license enforcement and case management system** for Akuru Type, a Maldivian font foundry. It tracks unauthorised font usage, manages enforcement cases, records license sales and fines, computes financial splits between Akuru Type and font contributors, and provides reporting for revenue and payouts.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Postgres + Auth + RLS) · Tailwind CSS · Radix UI · TypeScript

**Deployed:** Vercel → GitHub (`shazifadam/akuru-casemanage`)  
**Database:** Supabase (hosted Postgres with Row-Level Security)

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access — all pages, settings, user management, payouts |
| `enforcer` | Cases, Licenses, Buyers — no Contributors, Reports, Settings |

First admin must be set manually via SQL after first sign-up.

---

## Route Map

### Public Routes
| Route | Type | Description |
|---|---|---|
| `/login` | Static | Email + password auth via Supabase |
| `/health` | Dynamic API | Returns JSON: app status + env var presence |

### Protected Dashboard Routes
All protected by middleware → redirects to `/login` if unauthenticated.

| Route | Description |
|---|---|
| `/dashboard` | Stats cards, case pipeline, activity feed, contributor balances |
| `/cases` | Case list with filters (status, priority, font, party, search) + table/kanban toggle |
| `/cases/new` | Create new case |
| `/cases/[id]` | Case detail: info, activity timeline, evidence, buyer link, status actions |
| `/cases/[id]/edit` | Edit case details |
| `/licenses` | License registry with filters (font, status, source, license#) |
| `/licenses/new` | Create new license (calculates financials live) |
| `/licenses/[id]` | License detail: financials breakdown, QB sync status |
| `/licenses/[id]/edit` | Edit license |
| `/buyers` | Buyer directory with search + type filter |
| `/buyers/new` | Create new buyer |
| `/buyers/[id]` | Buyer detail with linked licenses |
| `/buyers/[id]/edit` | Edit buyer |
| `/contributors` | Contributors overview: total earned, paid out, outstanding balances |
| `/contributors/[id]` | Contributor detail with payout history and ledger |
| `/reports` | Revenue reports: monthly, by font, by contributor, enforcement stats (admin only) |
| `/settings` | Tab panel — Contributors · Fonts · Users (admin only) |

### Settings Tabs (Admin Only)
- **Contributors** — Create, edit, toggle status of font contributors
- **Fonts** — Create, edit, toggle status of fonts (linked to contributor)
- **Users** — Invite users, assign roles, revoke access (requires `SUPABASE_SERVICE_ROLE_KEY`)

---

## Data Model

### Tables

#### `users`
App users created by Supabase auth trigger on sign-up.
- `id` (uuid, FK → auth.users)
- `email`, `full_name`
- `role` → `admin | enforcer`

#### `contributors`
Font designers who receive a revenue share.
- `id`, `name`, `contact_email`
- `share_percentage` — default split (e.g. 70%)
- `status` → `active | inactive`

#### `fonts`
Typefaces offered by Akuru Type.
- `id`, `name`
- `contributor_id` (FK → contributors)
- `base_price`, `contributor_share_pct`, `gst_rate`
- `commission_model` → `contributor_owned | work_for_hire`
- `status` → `active | inactive`

#### `buyers`
Individuals or organisations using fonts.
- `id`, `name`, `organization`, `email`
- `buyer_type` → `individual | business | government | political_party | ngo`

#### `licenses`
Records of font usage (legal or resolved enforcement).
- `id`, `license_number` (auto-generated)
- `buyer_id`, `font_id`, `case_id` (optional FK)
- `invoice_amount`, `gst_amount`, `contributor_share`, `akuru_share`
- `payment_status` → `pending | paid | overdue`
- `source` → `direct_sale | enforcement | election_case`
- `is_fine` — true if this is an enforcement fine rather than a sale
- `purchase_date`, `due_date`
- `qb_synced` — QuickBooks sync flag
- `paid_to_contributor` — payout flag

#### `cases`
Enforcement cases tracking IP violations.
- `id`, `case_number` (auto-generated)
- `title`, `font_id`, `buyer_id`
- `status` → `identified → verify_license → license_verified → converted | fined | dismissed`
- `priority` → `low | medium | high | critical`
- `identified_date`, `resolved_date`
- `usage_description`, `constituency`, `usage_context`
- `identified_by` (FK → users)

#### `case_activity_log`
Audit trail for every action on a case.
- `case_id`, `user_id`
- `activity_type` → `status_change | comment | evidence_added | buyer_linked | license_issued | assignment_change`
- `old_value`, `new_value`, `comment`

#### `contributor_payouts`
Records of money paid out to a contributor.
- `contributor_id`, `amount`, `period_start`, `period_end`
- `invoice_number`, `paid_on`

#### `contributor_balances` (computed view)
- `contributor_id`, `contributor_name`
- `total_earned`, `total_paid_out`, `balance_owed`

### Financial Model
Every license auto-calculates on save via a Postgres trigger:
```
invoice_amount = base_price × (1 + gst_rate)
gst_amount     = base_price × gst_rate
contributor_share = base_price × contributor_share_pct
akuru_share    = base_price − contributor_share
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout — PWA meta, Inter font, SW register
│   ├── page.tsx                      # Redirects → /dashboard
│   ├── globals.css                   # Global styles + Tailwind
│   ├── error.tsx / global-error.tsx  # Error boundaries
│   ├── not-found.tsx                 # 404 page
│   ├── health/route.ts               # GET /health — diagnostics endpoint
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx            # Login page
│   └── (dashboard)/
│       ├── layout.tsx                # Auth gate + user fetch + DashboardShell
│       ├── error.tsx
│       ├── dashboard/
│       │   ├── page.tsx              # getDashboardData()
│       │   └── loading.tsx
│       ├── cases/
│       │   ├── page.tsx              # getCases() + getActiveFonts()
│       │   ├── loading.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── edit/page.tsx
│       ├── licenses/
│       │   ├── page.tsx              # getLicenses() + getActiveFonts()
│       │   ├── loading.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── edit/page.tsx
│       ├── buyers/
│       │   ├── page.tsx              # getBuyers() + getLicenseCountsByBuyer()
│       │   ├── loading.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── edit/page.tsx
│       ├── contributors/
│       │   ├── page.tsx              # getContributors() + getContributorBalances()
│       │   ├── loading.tsx
│       │   └── [id]/page.tsx
│       ├── reports/page.tsx          # Admin only
│       └── settings/
│           ├── page.tsx              # Tab nav: contributors | fonts | users
│           └── loading.tsx
│
├── components/
│   ├── pwa-register.tsx              # Registers /sw.js on client mount
│   ├── layout/
│   │   ├── dashboard-shell.tsx       # Sidebar + Header + MobileBottomNav + FAB
│   │   ├── sidebar.tsx               # Desktop left sidebar (collapsible)
│   │   ├── header.tsx                # Top bar — logo, global search, user menu
│   │   ├── mobile-bottom-nav.tsx     # Mobile: Dashboard|Cases|[FAB]|Licenses|More
│   │   ├── fab.tsx                   # Floating action button (desktop only)
│   │   └── global-search.tsx         # Cmd+K modal — searches buyers/fonts/licenses/cases
│   ├── cases/
│   │   ├── case-table.tsx            # Table view with bulk actions + status transitions
│   │   ├── case-kanban.tsx           # Kanban board grouped by status
│   │   ├── case-filters.tsx          # Filter bar
│   │   ├── case-status-badge.tsx
│   │   ├── case-priority-badge.tsx
│   │   ├── new-case-form.tsx
│   │   ├── edit-case-form.tsx
│   │   ├── case-detail-actions.tsx
│   │   ├── status-change-dialog.tsx  # Status change with comment
│   │   ├── activity-timeline.tsx     # Audit log display
│   │   ├── buyer-combobox.tsx        # Searchable buyer selector
│   │   ├── evidence-upload.tsx
│   │   └── verify-license-panel.tsx
│   ├── licenses/
│   │   ├── new-license-form.tsx      # Live financial preview
│   │   ├── edit-license-form.tsx
│   │   ├── license-actions.tsx
│   │   ├── license-payment-badge.tsx
│   │   └── license-source-badge.tsx
│   ├── buyers/
│   │   ├── buyer-form.tsx
│   │   ├── buyer-profile-actions.tsx
│   │   └── merge-dialog.tsx
│   ├── contributors/
│   │   ├── payout-calculator.tsx     # Calculates required price from desired payout
│   │   └── record-payout-form.tsx    # Record a payout transaction
│   ├── settings/
│   │   ├── contributors-section.tsx  # Inline CRUD for contributors
│   │   ├── fonts-section.tsx         # Inline CRUD for fonts
│   │   ├── user-list.tsx
│   │   └── invite-user-form.tsx
│   ├── dashboard/
│   │   └── case-charts.tsx           # Recharts line + bar charts (built, not currently rendered)
│   ├── reports/
│   │   └── reports-client.tsx        # Client-side report tables + charts
│   └── ui/                           # Radix UI primitives (shadcn pattern)
│       ├── avatar.tsx, badge.tsx, button.tsx, checkbox.tsx
│       ├── dialog.tsx, dropdown-menu.tsx, input.tsx, label.tsx
│       ├── scroll-area.tsx, select.tsx, separator.tsx, skeleton.tsx
│       ├── tabs.tsx, textarea.tsx
│       └── ... (tooltip, popover, toast)
│
├── lib/
│   ├── utils.ts                      # cn() — clsx + tailwind-merge
│   ├── actions/
│   │   ├── cases.ts                  # createCase, updateCase, bulkUpdateCaseStatus, deleteCase
│   │   ├── licenses.ts               # createLicense, updateLicense, markLicensePaid, deleteLicense
│   │   ├── buyers.ts                 # createBuyer, updateBuyer, searchSimilarBuyers
│   │   ├── contributors.ts           # recordPayout, calculatePayoutPrice
│   │   ├── contributors-fonts.ts     # createFont/updateFont/deleteFont, createContributor/updateContributor/deleteContributor
│   │   ├── users.ts                  # listUsers, createUser, updateUserRole, deleteUser
│   │   └── search.ts                 # globalSearch(query, typeFilter) → SearchResult[]
│   ├── data/
│   │   └── queries.ts                # All unstable_cache wrapped read queries (5-min TTL)
│   └── supabase/
│       ├── server.ts                 # Cookie-based SSR client (per-request)
│       ├── client.ts                 # Browser client
│       ├── cache-client.ts           # Module-level service-role client (for unstable_cache)
│       ├── middleware.ts             # updateSession — auth refresh + redirect logic
│       └── admin.ts                  # Admin-only Supabase operations
│
├── types/
│   ├── database.ts                   # All DB types, enums, label maps, calculateLicenseFinancials()
│   └── index.ts                      # UserRole, AppUser
│
└── middleware.ts                     # Runs on every non-static request via matcher

public/
├── manifest.json                     # PWA manifest — icons, shortcuts, display mode
├── sw.js                             # Service worker — network-first with cache fallback
├── logo.svg                          # Black logo (used in header, login)
├── logo-white.svg                    # White logo (used in sidebar, More drawer)
└── icons/                            # PWA icons
    ├── favicon.png
    ├── 48.png … 512.png              # 12 sizes for all platforms

supabase/migrations/
├── 001_enums.sql                     # All enum types
├── 002_core_tables.sql               # contributors, fonts, buyers
├── 003_transactional_tables.sql      # licenses, cases, activity_log, payouts, balances
├── 004_users_and_rls.sql             # users table, RLS policies, auth trigger
├── 005_functions_and_triggers.sql    # Financial auto-calc, fuzzy search, update triggers
├── 006_seed_data.sql                 # 6 contributors + 9 fonts (run once)
└── 007_data_migration.sql            # Data fixes / backfills
```

---

## Caching Architecture

```
Browser request
  → Middleware (Edge) — auth check, redirect if needed
    → Page (Server Component) — auth re-verified with cookie client
      → unstable_cache query (Data Cache, 5-min TTL)
        → cacheDb (service role, no cookies, module-level singleton)
          → Supabase Postgres

Mutation (Server Action)
  → Supabase write (cookie client, respects RLS)
  → revalidateTag("cases" | "licenses" | "buyers" | "contributors" | "fonts")
  → revalidatePath("/cases" | ...)
  → Next.js purges cache → next request fetches fresh data
```

**Cache tags:**
| Tag | Invalidated by |
|---|---|
| `fonts` | createFont, updateFont, deleteFont |
| `contributors` | createContributor, updateContributor, deleteContributor, recordPayout |
| `cases` | createCase, updateCase, bulkUpdateCaseStatus, deleteCase |
| `licenses` | createLicense, updateLicense, deleteLicense |
| `buyers` | createBuyer, updateBuyer |

---

## Mobile / PWA

- **Bottom nav (mobile):** Dashboard · Cases · `[+FAB]` · Licenses · More
- **More drawer:** Buyers · Contributors · Reports · Settings (slides in from right)
- **Desktop:** Collapsible left sidebar + floating FAB (bottom-right)
- **PWA manifest:** `start_url: /dashboard`, `display: standalone`, shortcuts for New Case / New License / Dashboard
- **Service worker:** Network-first for navigation, cache-first for static assets
- **Safe area:** Header pads `env(safe-area-inset-top)`, bottom nav pads `env(safe-area-inset-bottom)`

---

## Key UI Patterns

- **Skeleton loaders** on every main page via `loading.tsx` (Next.js streaming)
- **Global search** `Cmd+K` — modal with type chips (all / buyer / font / license / fine / sale / case)
- **FAB quick-create** — New Case / New License / New Buyer
- **Inline CRUD** in Settings for Contributors and Fonts (no separate pages needed)
- **Case pipeline** — dropdown actions per row: advance to next status, Mark as Fined, Dismiss
- **Live financial preview** on license create/edit form
- **QB sync flag** on licenses (QuickBooks accountant-ready marker)

---

## Environment Variables

| Variable | Where used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All clients, middleware | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + SSR client, middleware | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | cache-client (reads), admin.ts, user management | ✅ |

---

## Known Issues / Notes

- `public/PWA Icon Creator (Community).zip` committed to repo — can be deleted to reduce bundle size
- `case-charts.tsx` (Recharts line + bar charts) is built but not currently rendered on the dashboard — removed by user preference, kept for future use
- The `/health` route is excluded from middleware auth check — useful for Vercel deployment debugging
- Supabase project must not be paused (free tier auto-pauses after inactivity)
- After deploying to Vercel: update **Supabase → Auth → URL Configuration → Site URL** to match Vercel domain

---

## Sessions Log

### Session 1 — Foundation
- Project scaffolded with Next.js 15, Supabase, Tailwind, Radix UI
- Database schema: all 7 migrations written and applied
- Auth: login page, middleware, session refresh, role-based access
- Core CRUD pages: Cases, Licenses, Buyers, Contributors
- Dashboard with real data (pipeline counts, activity feed, balances)
- Reports page with revenue breakdowns

### Session 2 — Features & Polish
- **FAB** floating action button (New Case / New License / New Buyer)
- **Global search** `Cmd+K` — buyers, fonts, licenses, cases by type
- **Settings page** rebuilt with tabs — Contributors CRUD, Fonts CRUD, Users
- **Skeleton loaders** on all main pages (`loading.tsx`)
- **Data caching** via `unstable_cache` + tag-based revalidation on mutations
- **License edit page** at `/licenses/[id]/edit`
- **Case pipeline fix** — added Fined + Dismissed status transitions in table dropdown
- Vertical padding increased throughout UI
- QuickBooks sync flag wired to license actions

### Session 3 — Mobile, PWA & Deployment
- **Mobile bottom navigation bar** — Dashboard · Cases · FAB · Licenses · More
- **More drawer** — slides in from right, contains Buyers, Contributors, Reports, Settings
- Desktop FAB hidden on mobile (embedded in bottom nav instead)
- **PWA** — `manifest.json`, `sw.js` service worker, PWA meta tags, safe area insets
- **PWA icons** — 12 PNG sizes added to `public/icons/`
- **Logo** added to mobile header top-left (`logo.svg`)
- Settings tabs reordered: Contributors → Fonts → Users
- Middleware made resilient — try/catch around Supabase auth, graceful fallback
- `/health` diagnostic route added
- Deployed to Vercel via GitHub integration

---

## Next Session Ideas

- Remove `PWA Icon Creator (Community).zip` from `public/`
- Re-enable dashboard charts (case-charts.tsx is ready, just needs wiring)
- Contributor detail page (`/contributors/[id]`) — full payout ledger, per-license breakdown
- Financial Reports page — more granular breakdowns, date range picker
- CSV export for reports
- Evidence file upload for cases (Supabase Storage)
- Email notifications on case status change (Supabase Edge Functions or Resend)
- QuickBooks API integration (replace manual QB sync flag)
