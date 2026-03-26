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
- **Tickets** — My Tickets (QR codes for purchased tickets) + Buy Tickets (Stripe Checkout or free registration); pre-checkout buyer form with configurable fields + waiver agreement modal shown before purchase
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
- Content gating: `isEliteOnly` on posts, `eliteEarlyAccess`/`eliteDiscountPercent` on events
- Admin: elite badge on Members table; isEliteOnly checkbox on Posts form; Elite perks section on Events form

### Stripe Ticket Purchasing
- Admin configures ticket price/capacity per event via "Configure Tickets" (CreditCard icon) in Events table
- Paid events: admin sets £ price → creates Stripe product + price automatically
- Free events: set price = 0, users register with one tap
- Mobile checkout: `POST /api/tickets/checkout` → Stripe Checkout URL → `expo-web-browser` → redirect back to app → ticket issued
- Tickets stored with unique 16-char QR code, displayed in My Tickets tab as scannable QR code
- API routes: `GET /api/tickets/my`, `GET /api/tickets/event/:id`, `POST /api/tickets/checkout`, `POST /api/tickets/free`, `GET /api/tickets/success`, `POST /api/tickets/gift`, `GET /api/tickets/gift-success`
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

## Push Notifications

- `expo-notifications@0.32.x` installed in `artifacts/mobile`
- DB columns: `push_token TEXT`, `notifications_enabled BOOLEAN DEFAULT false` on `users`
- Hook: `artifacts/mobile/hooks/usePushNotifications.ts` — registers Expo push token, syncs status with API
- Mobile Preferences section (member.tsx): toggle for notifications + dark/light mode in a unified card
- API: `GET /users/me/notification-status`, `POST /users/me/push-token`, `PUT /users/me/notifications`
- Admin broadcast: `POST /api/admin/notify` — sends to all opted-in members via Expo Push API (batches of 100)
- Admin dashboard: "Push Notification Broadcast" card with title + body form and send result feedback

## Expanding Later

- **Ticketing**: Replace external URLs with internal Stripe checkout
- **Merch**: Connect Shopify storefront API or Stripe
- **Event Attendance**: Admin endpoint to mark users as attended
