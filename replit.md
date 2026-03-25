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
- **Home** — Hero section, community stats, upcoming events, latest updates, merch CTA
- **Tickets** — All events with buy ticket links (external URL)
- **Merch** — Product grid with buy links (external URL, Shopify-ready)
- **Updates** — Message board; guests see public posts, members see all
- **Member Zone** — Protected dashboard with stats, achievements, event history

### Authentication
- Email + password registration and login
- Token stored in AsyncStorage, sent via `x-auth-token` header
- Protected routes in Member Zone

### Data Models
- `users` — id, email, passwordHash, name, isAdmin, avatarUrl
- `events` — id, title, description, date, location, ticketUrl, imageUrl, attendeeCount
- `attendance` — id, userId, eventId, earnedMedal, attendedAt
- `posts` — id, title, content, imageUrl, isMembersOnly, authorId
- `merch` — id, name, description, price, imageUrl, buyUrl, category, inStock

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

## Expanding Later

- **Ticketing**: Replace external URLs with internal Stripe checkout
- **Merch**: Connect Shopify storefront API or Stripe
- **Admin Panel**: Add an admin screen in the app or a web admin dashboard
- **Event Attendance**: Admin endpoint to mark users as attended
- **Push Notifications**: Add Expo Push for member alerts
