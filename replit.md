# The Dodge Club Workspace

## Overview

The Dodge Club is a pnpm monorepo for a mobile-first community dodgeball application. It aims to provide a comprehensive platform for managing dodgeball events, community engagement, and member services. The project's vision is to enhance community interaction, streamline event participation, and offer exclusive benefits to members, ultimately growing the dodgeball community.

## User Preferences

I prefer concise and accurate responses. Please prioritize tasks that directly impact user experience or core functionality. When making changes, always consider the mobile-first approach and the implications for both the Expo app and the Express API. For any significant architectural decisions or changes to existing features, please ask for confirmation before proceeding.

## System Architecture

The project is structured as a pnpm monorepo, utilizing Node.js 24 and TypeScript 5.9.

**UI/UX Decisions:**
- **Mobile App (Expo):** Built with React Native and Expo Router, featuring a mobile-first design. Key screens include Updates, Home, Tickets, Merch, Member Zone, and Who's Going. The app incorporates interactive elements like horizontal scroll carousels, bottom sheet modals for ticket selection, and QR code functionalities for check-in and member identification.
- **Admin Dashboard & Scanner App:** React/Vite web applications. The Scanner app is specifically designed for door staff check-ins using QR codes.
- **Branding:** Brand colors are configurable via `artifacts/mobile/constants/colors.ts` with defined slots for primary, secondary, background, and accent colors.

**Technical Implementations:**
- **Frontend (Mobile):** Expo (React Native) with Expo Router, React Query, Linear Gradient.
- **Backend (API):** Express 5, with PostgreSQL and Drizzle ORM for data persistence.
- **Authentication:** Email and password registration/login, utilizing `bcryptjs` for password hashing and `x-auth-token` for session management. New users receive a unique referral code.
- **Data Validation:** Zod (`zod/v4`) and `drizzle-zod` for schema validation.
- **API Codegen:** Orval is used to generate API clients from an OpenAPI specification.
- **Email Service:** Integration with Brevo for transactional emails, supporting per-event customizable templates and global sender settings.
- **Ticketing System:** Supports multiple ticket types, discount codes, and integration with Stripe for payments. Free registration is also supported.
- **Check-In System:** PIN-based check-in for members at events and QR code scanning for door staff.
- **Elite Membership:** A Stripe subscription-based premium tier offering early access, discounts, and exclusive content. Managed via Stripe Checkout and Customer Portal, adhering to iOS App Store guidelines by directing payment flows to a web browser.
- **Push Notifications & In-App Announcements:** Leverages `expo-notifications` for push notifications and an internal `announcements` table for in-app messaging, with features for broadcast and unread tracking.
- **User Moderation:** Includes features for user reporting, blocking, and admin-level banning/unbanning.
- **Legal Content Management:** Privacy Policy and Terms of Service content are managed in the database and displayed via in-app modals.
- **Achievement System:** Tracks user achievements based on event attendance (e.g., First Timer, Regular, Veteran, Legend) and medals earned.

**Core Data Models:**
- `users`: Stores user details, authentication info, elite status, and referral data.
- `events`: Contains event details, ticketing information, check-in PIN, and email template configurations.
- `tickets`: Manages ticket purchases, status, and unique codes.
- `attendance`: Records user attendance at events.
- `posts`: Stores community posts with visibility settings (members-only, elite-only).
- `merch`: Details for merchandise products.
- `ticket_types`: Defines different tiers of tickets for events.
- `discount_codes`: Manages discount codes for events.
- `announcements`: Stores broadcast announcements.
- `user_reports`: Records user reports.
- `user_blocks`: Manages user blocking.
- `settings`: Stores global application settings, including legal content.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** bcryptjs
- **Payment Processing:** Stripe (Checkout, Customer Portal API)
- **Email Service:** Brevo (transactional email API)
- **Mobile Push Notifications:** Expo Notifications API
- **QR Code Scanning:** `@zxing/browser`
- **Frontend Utilities:** React Query, Linear Gradient
- **Validation:** Zod
- **API Generation:** Orval