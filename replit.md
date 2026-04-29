# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced via real OTP verification. PostgreSQL backend for social trust graph, messaging, OTP codes, feedback, and stats.
5-pathway intent system (Host, Joiner, Co-Seeker, Sublessor, Sublessee) with 16-point amenity tracking, zone-filtered marketplace, and integrated real-time messaging.

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000) + PostgreSQL (via pg Pool)
- **State**: React Context + AsyncStorage (persistent) + PostgreSQL (social trust + chat)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis in UI)
- **Email**: Resend (`resend` npm package) — falls back to console.log if RESEND_API_KEY not set
- **Images**: expo-image-picker for listing photo uploads

### Design System ("Ponyo-Sea")
- `constants/colors.ts` — single source of truth
- Foam: #F8F9F3, Teal/Ocean: #005F73, Ponyo Orange: #FF6B4E, Bucket Yellow: #FFD966
- Warm Cream: #FBFBF9, Dark Teal: #2C555C, Coral: #FF8C69
- Charcoal: #1A2E35, Card: #FFFFFF, Border: #DDE0D8
- Disabled: bg #E0E8E9, text #8A9FA3
- Responsive web: mobile (<768px) uses 500px max-width centered + bottom tabs; desktop (≥1024px) removes 500px cap, uses sidebar nav + 720px content max-width (960px for marketplace 2-column grid)
- `hooks/useResponsive.ts` — shared breakpoint hook (mobile/tablet/desktop), exports contentMaxWidth, sidebarWidth, columns
- `components/WebSidebar.tsx` — left sidebar navigation for desktop web (Browse, Inbox, Profile + Marketplace, Matchmaker)

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage
- `app/onboarding.tsx` — Email OTP step (Step 0) → Intent step (Step 1) → About You (Step 2). Supply-side roles (Host/Sublessor) finish after 3 steps and route to mandatory post-sublease gateway. Demand-side roles (Joiner/CoSeeker/Sublessee) continue through 6 steps (Preferences, Location, Breaks).
- `app/admin.tsx` — Hidden admin dashboard (5-tap on profile version label)

### Tabs (app/(tabs)/) — 3 tabs
- `index.tsx` — Browse: ZonePicker + 4 UIUC housing category cards + Matchmaker/Breaks shortcuts
- `inbox.tsx` — Inbox: conversation list with building/price context, navigates to chat
- `profile.tsx` — User profile, stats, Sign Out, Reset All Data; 5-tap version label → /admin
- `map.tsx` — Hidden from tab bar (href: null), legacy PopMap screen

### Stack Screens
- `app/matchmaker.tsx` — Hinge/Bumble-style full-bleed hero card (no swipe gestures — button-only). Card fills ~72% screen height with CustomAvatar fallback (or profile image), LinearGradient overlay, large coral match score (60px), name/vitals/major in white, glassmorphic habit chips from vibeProfile, icebreaker prompt box. 80px circular action buttons: red 🐼 (pass) / green 💚 (match). Mutual match detection: mock users u1,u3,u5,u7 have "pre-liked" the current user; on mutual match shows "It's a Match! 🎉" modal with "Say Hi 👋" button that auto-creates conversation and navigates to chat. No zone filter on matchmaker screen.
- `app/marketplace.tsx` — Sublease listings with 60% photo cards, amenity overlay, Message button, FacePile, Mark as Leased
- `app/post-sublease.tsx` — Multi-step listing form (4 steps: Basic → Unit Details/Photos → Amenities → Cleanliness/Dates). Gateway mode (?gateway=1) locks the back button on step 0 and requires full completion before entering the main app. Strict validation: Zone + Dates + Price + Landlord + ≥1 Photo required. Auto-categorization: lease type auto-tagged based on move-in/move-out date range. "Publish Listing ✨" coral (#FF8C69) submit button. Warm cream (#FBFBF9) background, dark teal (#2C555C) header text. Zone/leaseType synced to global user profile on submit.
- `app/chat.tsx` — Chat room with listing preview header, timestamped bubbles, send input
- `app/link-listing.tsx` — Bridge screen for Host/Sublessor users without listings

- `app/crash-cash.tsx` — Urgent short-term "Crash & Cash" social feed. Pinterest 2-column grid with urgency sort (ascending targetDate). Posts have status (active/completed), targetDate (7-day max), mandatory image upload. Owners see "Mark as Filled" instead of DM. Feed auto-filters expired/completed posts. DM navigates to chat with source=crash_cash for contextual icebreaker chips.
- `app/compatibility-setup.tsx` — Gen Z coseeker vibe profile builder (identity, zodiac, MBTI, habits, icebreaker prompts → saves VibeProfile then routes to matchmaker)
- `app/admin.tsx` — Hidden admin dashboard

## Features

### Integrated Messaging System
- "Message [Name]" button on every listing card (marketplace) and profile card (matchmaker)
- Creates conversation tied to specific listing context (building name + price)
- Inbox tab shows all conversations sorted by most recent, with building/price/avatar headers
- Chat room has listing preview card at top, timestamped message bubbles, text input + send
- State: conversations + chatMessages stored in AsyncStorage (+ DB tables for persistence)

### 5-Pathway Intent System
- Intent types: Host, Joiner, Co-Seeker, Sublessor, Sublessee
- Selected during onboarding Step 1 (after email verification)
- Post-registration routing:
  - Host → /post-sublease?mode=host (Post My Apartment form, redirects to Roommate Openings feed after posting; own listing pinned to top with "Your Listing" badge)
  - Joiner → /marketplace?category=roommate_openings (Roommate Openings filter)
  - Co-Seeker → /matchmaker
  - Sublessor → /post-sublease
  - Sublessee → /marketplace?category=short_term
- Intent stored in UserProfile (`intent` field)

### Email OTP Authentication
- OTP screen: 6 individual digit boxes, countdown timer (60s resend)
- Backend: POST /api/auth/send-otp, POST /api/auth/verify-otp
- **OTP is hardcoded to `123456` for testing**

### Browse Card UI (60% Photo + Amenity Overlay + Gallery)
- Listing cards show image at 60% height (or colored placeholder with building icon)
- Swipeable photo gallery when multiple images exist (with dot indicators)
- Floor plan shown as last gallery slide with "Floor Plan" label overlay
- Unit Type badge (e.g., "2B2B") displayed next to price
- "Fully Private" badge (green shield) when both bedroom and bathroom are private
- 2x2 amenity icon overlay at bottom-right of photo (Bed/Laundry/WiFi/AC)

### 16-Point Amenity System
- **Foundational**: isFurnished, hasLaundry, hasWifi, hasAC
- **Collegiate**: hasStudyLounge, hasPrinting, hasBikeStorage, hasSecurity
- **Financial**: utilsIncluded, noDeposit, parkingIncluded
- **Building**: hasGym, hasPool, hasElevator, hasRooftop, hasLockers

### Smart Create Listing Form (4 steps)
- **Step 1**: Basic info — building, address, price, lease type, landlord, zone, breaks, description
- **Step 2**: Unit geometry + privacy + photos
  - Unit Type input (e.g., "2B2B", "Studio")
  - Private Bedroom toggle (isPrivateBedroom)
  - Private Bathroom toggle (isPrivateBathroom, syncs bathroomType)
  - Kitchen type (Private/Communal)
  - 3 required photo slots with dynamic labels + 1 optional Floor Plan slot
  - Slot 1: "Bedroom", Slot 2: "Private/Shared Bathroom", Slot 3: "Private/Communal Kitchen"
  - Slot 4 (optional): Floor Plan image (dashed border, 16:9 aspect)
- **Step 3**: 16 amenity toggles in grouped sections
- **Step 4**: Cleaning frequency + shoe policy + date picker grid for move-in/out

### Zone Filtering
- `components/ZonePicker.tsx` — Horizontal scrolling zone chips
- Available on Browse tab and Marketplace screens (removed from Matchmaker)

### Mark as Leased + MicroFeedback
- "Mark as Leased" button on own listing cards → congrats sheet → feedback modal

### Admin Dashboard (app/admin.tsx)
- Accessed by tapping profile version label 5 times within 3 seconds

## Data Types (context/AppContext.tsx)
- `Intent`: 'host' | 'joiner' | 'co_seeker' | 'sublessor' | 'sublessee'
- `BathroomType`: 'private' | 'shared'
- `KitchenType`: 'private' | 'communal'
- `CleaningFrequency`: 'daily' | 'weekly' | 'monthly'
- `ShoePolicy`: 'shoes_off' | 'front_door' | 'no_policy'
- `Amenities`: 16-boolean interface with DEFAULT_AMENITIES constant
- `Conversation`: id, participant IDs, listing context (building, price, unitType), last message
- `ChatMessage`: id, conversationId, senderId, content, createdAt
- `SubleasePost`: includes unitType, isPrivateBedroom, isPrivateBathroom, floorPlanUrl, roomsAvailable, currentResidentBio, listingType ('sublease'|'roommate'), bathroomType, kitchenType, moveInDate, moveOutDate, amenities, images

## Database Schema (PostgreSQL)
Tables: `users`, `friendships`, `vouches`, `listings`, `break_posts`, `otp_codes`, `feedback`, `stats`, `conversations`, `messages`

## API Routes (server/routes.ts)
- POST /api/auth/send-otp, POST /api/auth/verify-otp
- POST /api/users, GET /api/users/by-email/:email
- GET/POST/DELETE /api/friends/:email
- POST/DELETE /api/vouches
- GET /api/trust/:viewerEmail/:targetEmail
- GET/POST /api/listings, DELETE /api/listings/:id
- POST /api/conversations — create/get conversation
- GET /api/conversations/:userId — list conversations
- POST /api/messages — send message
- GET /api/messages/:conversationId — get messages
- POST /api/stats/increment, POST /api/feedback, GET /api/admin/stats

## Components
- `components/CustomAvatar.tsx` — global avatar component: shows uploaded profile image (Image) or colored circle with initials (fallback). Used in Profile, Inbox, Chat, Crash & Cash, Matchmaker.
- `components/ZonePicker.tsx` — horizontal scrolling zone filter chips
- `components/FacePile.tsx` — overlapping avatar initials with tap-to-expand
- `components/MicroFeedback.tsx` — post-lease feedback modal
- `components/ScamBanner.tsx` — dismissable scam warning
- `components/ErrorBoundary.tsx` — crash boundary with reloadAppAsync

## Deployment (Production)
- **Build**: `npx expo export --platform web && npm run server:build`
- **Run**: `npm run server:prod` (Express serves both API routes + dist/ static files)
- **Target**: Autoscale — Express serves the `dist/` folder (Expo web export) as static files with SPA fallback, plus all `/api/*` routes
- When `dist/` folder exists, server serves web app from it; otherwise falls back to `static-build/` + landing page (dev/legacy mode)
- `serve` package installed for standalone static serving if needed (`npx serve dist -l $PORT`)

## Workflows
- `Start Backend`: `npm run server:dev` → Express on port 5000
- `Start Frontend`: `npm run expo:dev` → Expo Metro on port 8081

## Environment Variables
- `SESSION_SECRET` — set in Replit secrets
- `RESEND_API_KEY` — optional; enables real OTP emails via Resend
- `RESEND_FROM_EMAIL` — optional; email address OTPs are sent from

## Notes
- OTP hardcoded to `123456` for testing — revert `randomCode()` in server/routes.ts for production
- My Circle tab deleted, replaced by Inbox tab
- Web view centered at max-width 500px
- react-native-maps@1.18.0 installed but NOT used
- Web platform: 67px top / 34px bottom inset handling
- AsyncStorage keys: @popmatch_user, _onboarded, _matches, _liked, _passed, _scam, _subleases, _breaks, _friends, _conversations, _chatmessages
