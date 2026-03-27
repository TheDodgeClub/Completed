# The Dodge Club Workspace

## Overview

pnpm workspace monorepo for The Dodge Club — a mobile-first community dodgeball app built with Expo (React Native) and an Express API backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Expo (React Native) with Expo Router, React Query, Linear Gradient
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Auth**: bcryptjs password hashing, token via `x-auth-token` header
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
workspace/
├── artifacts/
│   ├── api-server/          # Express API server (port 8080)
│   └── mobile/              # Expo mobile app (port 18115)
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts          # Database seed script
```

## App Features

### Mobile App (Expo)
- **Updates tab** — Published videos (horizontal scroll carousel with thumbnails, tap to open URL) + posts/announcements
- **Home** — Hero section, community stats, upcoming events (published only), latest updates, merch CTA
- **Tickets** — My Tickets (QR codes for purchased tickets) + Buy Tickets (Stripe Checkout or free registration); pre-checkout buyer form with configurable fields + waiver agreement modal shown before purchase; **ticket type selector** (bottom sheet modal with type cards when an event has multiple tiers defined); **discount code field** in the type selector (validate against API, shows discounted price preview, passes to checkout)
- **Merch** — Product grid with buy links (external URL, Shopify-ready)
- **Updates** — Message board; guests see public posts, members see all; elite-only posts locked behind Elite paywall
- **Member Zone** — Protected dashboard with player/supporter split; achievement progress bars with share button (player only); referral code card with copy/share (all users); event history (player only); XP progress (player only); supporter badge; "Refer a Friend" section
- **Who's Going** — Event cards in Buy Tickets tab show avatars + count of confirmed attendees
- **Gift a Ticket** — When you own a ticket, a gift button opens a modal to send a ticket to a friend's email
- **Elite Membership** — £8.99/month Stripe subscription paywall (app/elite.tsx); benefits: early ticket access, tips & tricks, elite-only posts, discounted tickets, elite badge; Stripe Customer Portal for self-service management

### Ticket Confirmation Emails
- Sent automatically after free ticket registration and paid Stripe checkout
- Uses Brevo transactional email API (REST, no SDK) via `BREVO_API_KEY` secret
- Email service: `artifacts/api-server/src/services/email.ts`
- Template variables: `{{userName}}`, `{{eventName}}`, `{{eventDate}}`, `{{eventLocation}}`, `{{ticketCode}}`
- Template customisable from Admin → Settings (stored in `settings` table as `emailFromName`, `emailFromAddress`, `emailSubject`, `emailBodyHtml`)
- Default branded HTML template used if no custom body is set
- Admin can send a test email via Settings → "Send Test Email" button (`POST /api/settings/admin/test-email`)

### Authentication & Registration
- Email + password registration and login; 2-step onboarding (name/email/password → Player/Supporter role selection + optional referral code)
- Token stored in AsyncStorage, sent via `x-auth-token` header
- Protected routes in Member Zone
- New users get a unique 6-char referral code at registration

### Data Models
- `users` — id, email, passwordHash, name, isAdmin, avatarUrl, stripeCustomerId, **isElite**, **stripeSubscriptionId**, **eliteSince**, **accountType** (player|supporter), **referralCode**, **referredBy**
- `events` — id, title, description, date, location, ticketUrl, imageUrl, attendeeCount, ticketPrice, ticketCapacity, stripeProductId, stripePriceId, **eliteEarlyAccess**, **eliteDiscountPercent**
- `tickets` — id, userId, eventId, stripeCheckoutSessionId, stripePaymentIntentId, status (pending/paid/free/cancelled), ticketCode (16-char hex), checkedIn, amountPaid
- `attendance` — id, userId, eventId, earnedMedal, attendedAt
- `posts` — id, title, content, imageUrl, isMembersOnly, **isEliteOnly**, authorId
- `merch` — id, name, description, price, imageUrl, buyUrl, category, inStock

### Elite Membership (£8.99/month Stripe subscription)
- Route: `artifacts/api-server/src/routes/elite.ts` — registered at `/api/elite`
- `GET /api/elite/status` — current user's elite status
- `POST /api/elite/subscribe` — creates Stripe Checkout Session (subscription mode, £8.99/month)
- `GET /api/elite/success` — verifies session after payment, grants elite status, redirects to mobile app
- `GET /api/elite/manage` — creates Stripe Customer Portal session for self-service subscription management
- Mobile paywall: `artifacts/mobile/app/elite.tsx` — navigate with `router.push('/elite')`
  - **iOS App Store compliant**: "Join Elite" and "Manage Subscription" buttons open `EXPO_PUBLIC_WEBSITE_URL` (defaults to `https://thedodgeclub.co.uk/landing`) in the browser — no in-app Stripe payment
  - `EXPO_PUBLIC_WEBSITE_URL` is set to `https://thedodgeclub.co.uk/landing` (custom domain)
- Content gating: `isEliteOnly` on posts, `eliteEarlyAccess`/`eliteDiscountPercent` on events
- Admin: elite badge on Members table; isEliteOnly checkbox on Posts form; Elite perks section on Events form

### Stripe Ticket Purchasing + Ticket Types + Discount Codes
- Admin manages tickets per event via "Ticket Management" modal (3 tabs: Ticket Types, Discount Codes, Base Pricing)
- **Ticket Types** (`ticket_types` table): multiple tiers per event (name, price, quantity, sale window, active flag); each gets its own Stripe product+price created automatically; quantity sold tracked
- **Discount Codes** (`discount_codes` table): percent or fixed-amount codes per event; max uses, expiry, active flag; uses count incremented atomically on checkout success
- **Base Pricing** (legacy): event-level `ticketPrice` + `stripePriceId`; used when no ticket types defined
- Mobile checkout flow: if event has active ticket types → show `TicketTypeModal` (bottom sheet) → user picks type + optional discount code → validated client-side preview + server-side validation → checkout or free registration
- `GET /api/tickets/validate-code?eventId=&code=` — validates discount code (auth required); returns `discountType`, `discountAmount`
- `POST /api/tickets/checkout` accepts `ticketTypeId`, `discountCode`; calculates final amount in pence, passes `unit_amount` to Stripe `price_data` override; increments `quantity_sold` + `uses_count` on success
- `POST /api/tickets/free` accepts `ticketTypeId`; increments `quantity_sold`
- Admin CRUD: `GET/POST /api/admin/events/:id/ticket-types`, `PUT/DELETE /api/admin/ticket-types/:id`, `GET/POST /api/admin/events/:id/discount-codes`, `PUT/DELETE /api/admin/discount-codes/:id`
- Tickets stored with unique QR code, displayed in My Tickets tab
- API routes: `GET /api/tickets/my`, `GET /api/tickets/event/:id`, `POST /api/tickets/checkout`, `POST /api/tickets/free`, `GET /api/tickets/validate-code`, `GET /api/tickets/success`, `POST /api/tickets/gift`, `GET /api/tickets/gift-success`
- `GET /api/events/:id/attendees` — returns attendees (users with confirmed tickets) for an event
- `POST /api/admin/notify-event-reminders` — sends 48h push notification reminders to ticket holders for events within the next 48 hours

### Achievement System
- First Timer (1 event)
- Regular (5 events)
- Veteran (10 events)
- Legend (20 events)
- Medal Winner (1 medal)
- Champion (5 medals)

## Seed Data / Test Accounts

Run: `pnpm --filter @workspace/scripts run seed`

- **Admin**: admin@dodgeclub.com / dodgeball123
- **Member**: sam@example.com / dodgeball123

## Brand Colours

Edit `artifacts/mobile/constants/colors.ts` to swap in your exact hex codes.

Placeholder slots:
- `PRIMARY` — [INSERT BRAND PRIMARY] — buttons, highlights
- `SECONDARY` — [INSERT BRAND SECONDARY] — accents, cards
- `BACKGROUND` — [INSERT BRAND BACKGROUND] — main background
- `ACCENT` — [INSERT BRAND ACCENT] — medals, badges, gold elements

## API Endpoints

All routes under `/api`:

- `GET /api/healthz`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/events` — all events
- `GET /api/events/upcoming` — upcoming only
- `GET /api/events/:id`
- `POST /api/events` — admin: create event
- `GET /api/users/:id/profile`
- `GET /api/users/:id/attendance`
- `GET /api/users/:id/achievements`
- `GET /api/posts` — all posts
- `POST /api/posts` — admin: create post
- `GET /api/merch` — all merch
- `GET /api/stats` — community stats

## Push Notifications & In-App Announcements

- `expo-notifications@0.32.x` installed in `artifacts/mobile`
- DB columns: `push_token TEXT`, `notifications_enabled BOOLEAN DEFAULT false` on `users`
- Hook: `artifacts/mobile/hooks/usePushNotifications.ts` — registers Expo push token, syncs status with API
- Mobile Preferences section (member.tsx): toggle for notifications + dark/light mode in a unified card
- API: `GET /users/me/notification-status`, `POST /users/me/push-token`, `PUT /users/me/notifications`
- Admin broadcast: `POST /api/admin/notify` — sends to all opted-in members via Expo Push API (batches of 100); also saves to `announcements` DB table
- Admin dashboard: "Push Notification Broadcast" card with title + body form and send result feedback; "Notification History" card shows all past broadcasts with recipient count

### In-App Announcement System
- DB table: `announcements` — stores every broadcast with `title`, `body`, `sent_count`, `sent_by`, `created_at`
- API: `GET /api/announcements` (auth required) — returns recent announcements for the mobile app
- API: `GET /api/admin/announcements` (admin only) — returns last 20 sent announcements for admin history
- Hook: `artifacts/mobile/hooks/useAnnouncements.ts` — fetches announcements, tracks `lastSeenAnnouncementId` in AsyncStorage, computes `unreadCount`
- Updates tab: Announcements section appears at the top of the screen with styled cards showing title, body, and time; badge count on the Updates tab icon when there are unread announcements; tabs open as "seen" via `useFocusEffect`
- Member profile tab: Latest announcement shown as a notification banner between the hero section and the content body, visible for all users (players and supporters)

## Expanding Later

- **Ticketing**: Replace external URLs with internal Stripe checkout
- **Merch**: Connect Shopify storefront API or Stripe
- **Event Attendance**: Admin endpoint to mark users as attended
