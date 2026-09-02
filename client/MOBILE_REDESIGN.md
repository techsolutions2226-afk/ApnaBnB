# ApnaBnB Frontend Redesign — Mobile-First Minimalist Fintech

## Decisions

| Item | Choice |
|---|---|
| CSS | Full Tailwind migration, delete CSS files per-component as migrated |
| Colors | New fintech palette (indigo/slate base + emerald accent) |
| UI Primitives | `@headlessui/react` + Tailwind |
| Mobile Nav | Bottom nav bar (<768px), top navbar (>=768px) |
| Scope | Full app, step by step, reusable component system |
| OAuth | DO NOT TOUCH — Login/Signup Google auth flow stays exactly as-is |

## OAuth Files — DO NOT MODIFY

These files must NOT be changed in any way during this redesign:
- `src/utils/googleAuth.js`
- `src/components/common/GoogleAuthButton.jsx`
- `src/components/common/GoogleSignupDetails.jsx`
- `src/context/AuthContext.jsx`
- `src/services/authService.js`
- `src/api/apiClient.js`

Only the visual wrapper/container around `<GoogleAuthButton>` in Login.jsx and Signup.jsx may be restyled. The Google OAuth flow, state management, and redirects must remain identical.

---

## Phase 0 — Foundation

### 0A. Tailwind Theme + New Color Tokens
- Replace all 37 CSS file tokens with Tailwind @theme tokens
- Primary: slate-900 / indigo-600
- Accent: emerald-500
- Neutral: slate scale (50-900)
- Background: white + slate-50
- Border: slate-200/slate-300
- Text: slate-900 (primary), slate-500 (secondary), slate-400 (muted)
- Spacing scale: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64
- Radii: sm=6, md=8, lg=12, xl=16, 2xl=20, full=9999
- Shadows: xs, sm, md, lg, xl (subtle, cool-toned)
- Font families: Inter (body) + Plus Jakarta Sans (headings)

### 0B. Install Dependencies
- `npm install @headlessui/react`

### 0C. Create `src/components/ui/` — Shared Component Library
- Button.jsx (primary, secondary, ghost, danger, icon)
- Input.jsx (with label, error, helper, icon)
- Select.jsx (Headless UI Listbox)
- Modal.jsx (sm, md, lg, full-mobile)
- Sheet.jsx (bottom, left, right drawers)
- Card.jsx (default, stat, property)
- Badge.jsx (success, warning, danger, info, neutral)
- Avatar.jsx (xs, sm, md, lg)
- Tabs.jsx (pills, underline, enclosed)
- EmptyState.jsx (icon, title, description, CTA)
- Skeleton.jsx (card, text, avatar, stat)
- PageHeader.jsx (title, subtitle, rightAction)
- Section.jsx (title, description, content)
- StatCard.jsx (icon, label, value, trend)
- DropdownMenu.jsx (groups, dividers, icons)
- Breadcrumbs.jsx (auto from route)
- Toast.jsx (wrap react-toastify)

### 0D. Layout System
- PublicLayout.jsx (Home, About, Contact, PropertyDetail, SearchResults)
- DashboardLayout.jsx (all dashboard pages)
- AdminLayout.jsx (all admin pages)
- AuthLayout.jsx (Login, Signup, ForgotPassword, ResetPassword)
- SettingsLayout.jsx (Account settings sub-pages)

---

## Phase 1 — Navigation Shell

### 1A. Desktop Top Navbar (>=768px)
- Sticky bar: Logo | Nav Links | Search | Actions | Profile Menu
- Blur backdrop, subtle border-bottom
- Profile dropdown via Headless UI Menu

### 1B. Mobile Bottom Nav (<768px)
- Fixed bottom bar, 5 tabs: Home | Search | + List | Dashboard | Profile
- Center "+" button elevated/prominent
- Active tab = primary color, inactive = muted
- env(safe-area-inset-bottom) for iPhone
- Hamburger removed for primary nav

### 1C. Mobile Top Header (<768px)
- Compact: Logo left | Notification bell + Avatar right
- Back button for detail pages

---

## Phase 2 — Core Public Pages

### 2A. Home Page
- Hero: Full-width, strong headline, clean search panel
- CTA section: Buy/Rent cards
- Popular listings grid
- Delete: Home.css

### 2B. Property Detail Page
- Image gallery (carousel mobile, grid desktop)
- Price -> Title -> Location -> Key Facts hierarchy
- Sticky mobile CTA bar
- Sections: Description, Amenities, Map, Reviews
- Delete: PropertyDetail.css

### 2C. Search Results Page
- Mobile: Full-width cards, horizontal filter chips, bottom sheet filters
- Desktop: Grid + optional map
- Delete: SearchResults.css, PropertyCards.css, SearchDropdowns.css

### 2D. Auth Pages
- Mobile: Full-screen single column
- Desktop: Split layout
- Headless UI Field + Input
- Delete: Auth.css, Signup.css
- NOTE: Google OAuth button stays as-is, only wrapper restyled

---

## Phase 3 — Dashboard Shell + Core Pages

### 3A. Unified Dashboard Layout
- Replace DashboardShell + AdminShell with one DashboardLayout
- Desktop: Left sidebar (250px) + content
- Mobile: Bottom nav + top header with hamburger for secondary nav
- Role selector: Headless UI Listbox
- Delete: DashboardShell.css, AdminShell.css

### 3B. Dashboard Home
- Stat cards, recent activity, quick actions
- Delete: Dashboard.css

### 3C. Listings Management
- Table desktop, card list mobile
- Step form with progress
- Delete: MyListings.css, Listing.css, ViewListing.css

### 3D. Requirements, Matches, Wishlists, Trips
- Consistent list layouts
- Delete: Requirement.css, Match.css, Wishlists.css, Trips.css

---

## Phase 4 — Account Settings

### 4A. Settings Layout
- Mobile: Stacked cards
- Desktop: Left nav + content
- Headless UI for switches, selects, file uploads
- Delete: Account.css, Profile.css, Notifications.css

---

## Phase 5 — Admin Pages

### 5A. Admin Pages (10 pages)
- Tables: Desktop full table, Mobile card list
- Incremental migration
- Delete: Admin.css

---

## Phase 6 — Polish

### 6A. Accessibility
- focus-visible ring utility (Tailwind focus-visible:ring-2)
- Skip-to-content link in all layouts
- aria-label on all icon buttons
- Modal focus trapping (Headless UI handles)
- Visible form labels

### 6B. Loading States
- Skeleton loaders for all data pages
- Button loading spinners
- Content stability (no layout shift)

### 6C. Empty States
- Every data page: icon + title + description + CTA
- Reuse EmptyState component

### 6D. Error States
- Page-level error boundaries with retry
- Inline form errors
- Toast for async errors

### 6E. Animations
- Keep Framer Motion for transitions + micro-interactions
- Remove GSAP parallax (heavy, not mobile-friendly)
- Subtle: fade-in, slide-up, scale-on-tap

---

## CSS Files Deletion Plan

| Phase | Files Deleted |
|---|---|
| 0 | index.css (rewritten with Tailwind @theme) |
| 1 | Navbar.css, Footer.css |
| 2 | Home.css, PropertyDetail.css, SearchResults.css, PropertyCards.css, SearchDropdowns.css, About.css, Contact.css |
| 3 | DashboardShell.css, AdminShell.css, Dashboard.css, MyListings.css, Listing.css, ViewListing.css, Requirement.css, Match.css, Wishlists.css, Trips.css |
| 4 | Account.css, Profile.css, Notifications.css, Auth.css, Signup.css |
| 5 | Admin.css |
| 6 | Common.css, Plans.css, Breadcrumb.css, RefreshButton.css, Review.css, AiDescription.css, cinematic.css, CategoryBar.css, ImageUpload.css, GoogleSignupDetails.css |

---

## Execution Order

Phase 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6

Each phase is independently testable. App works after each phase.
No phase breaks existing functionality.
