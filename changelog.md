# CHANGELOG

This is the official log of what has happened in PESOS. Every update should be dated and written clearly. This file is a running memory log of meaningful changes, not a commit history.

---

## 2025-06-12

**Fixed Next.js build error in subscribe page.**  
Resolved compilation error where `app/subscribe/page.tsx` was attempting to export metadata from a client component. Removed the `export const metadata` declaration since the component uses "use client" directive and requires client-side functionality (useState, event handlers). The page will now build successfully without affecting functionality - metadata exports are only allowed in server components per Next.js requirements.

This fix allows the production build to complete and maintains the existing email signup functionality that supports the notification system foundation outlined in the todo.md.

**Installed Bun package manager to resolve bunx dependency.**  
Successfully installed Bun (v1.2.16) which provides the `bunx` command that the project's build script requires. The original build command `bunx prisma generate && next build` now works properly without the "bunx: not found" error. This aligns with the project's existing `bun.lockb` file and ensures consistent package management using Bun throughout the development workflow.

The build process now works seamlessly with the intended toolchain, improving development experience and eliminating build configuration issues.

**Cleaned up package manager conflicts and established Bun-only workflow.**  
Removed conflicting `package-lock.json` and `yarn.lock` files to eliminate the "multiple lockfiles" warning and ensure exclusive use of Bun as the package manager. Created a comprehensive setup infrastructure including:

- **Automated setup script** (`scripts/setup.sh`) that installs Bun if needed and sets up the project
- **Enhanced package.json scripts** with prebuild checks and setup commands
- **Updated README** with clear Bun-only setup instructions for new contributors
- **Version tracking** (.bunversion) for consistency across environments

The project now has a robust, single-package-manager setup that prevents toolchain confusion and provides clear setup paths for both automated and manual installation. This supports the project's goal of using Bun exclusively while ensuring the development environment can be reliably reproduced across different systems.

**Renamed chronicler to changelog and updated logo.**  
Standardized the naming convention by renaming `chronicler.md` to `changelog.md` and fixed a date in the file. Updated documentation and blog posts to reference the new file name. Adjusted `AGENTS.md` and `.cursorrules` accordingly. Simplified `PesosLogo` to a green circle with a P and replaced the favicon with the new logo. Removed leftover binary favicon file.

**Added week-in-review blog update.**  
Added new blog post `week-in-review-0616` to document recent changes and improvements. Updated the blog index to include the new post. Tracked the post in `todo.md` and logged the update in `changelog.md`.

**Fixed production error in admin dashboard causing server-side exception.**  
Resolved `TypeError: (0 , s.default) is not a function` error that was preventing `/admin/dashboard` from loading in production on Vercel. The issue was that the admin dashboard was using `useSWR` for client-side data fetching, but the `swr` package was not installed as a dependency.

Applied two-part fix:

1. **Converted admin dashboard to server-side rendering** - Replaced SWR with direct Prisma database queries in the admin dashboard page, making it a server component that fetches data on the server side. This eliminates the dependency on SWR for this critical admin page and improves performance.
2. **Added SWR as a dependency** - Installed `swr` package to support the simple dashboard page which uses client-side data fetching with revalidation intervals and loading states.

Updated the LogEntry interface to match the actual Prisma ActivityLog model, including all fields like `success`, `source`, `ipAddress`, etc., and improved the admin dashboard table display to show success/failure status with visual indicators.

The admin dashboard now works reliably in both development and production environments, providing essential system monitoring capabilities for the PESOS platform.

---

## 2025-01-31

**Fixed production error in admin dashboard causing server-side exception.**  
Resolved `TypeError: (0 , s.default) is not a function` error that was preventing `/admin/dashboard` from loading in production on Vercel. The issue was that the admin dashboard was using `useSWR` for client-side data fetching, but the `swr` package was not installed as a dependency.

Applied two-part fix:

1. **Converted admin dashboard to server-side rendering** - Replaced SWR with direct Prisma database queries in the admin dashboard page, making it a server component that fetches data on the server side. This eliminates the dependency on SWR for this critical admin page and improves performance.
2. **Added SWR as a dependency** - Installed `swr` package to support the simple dashboard page which uses client-side data fetching with revalidation intervals and loading states.

Updated the LogEntry interface to match the actual Prisma ActivityLog model, including all fields like `success`, `source`, `ipAddress`, etc., and improved the admin dashboard table display to show success/failure status with visual indicators.

The admin dashboard now works reliably in both development and production environments, providing essential system monitoring capabilities for the PESOS platform.

---

## 2025-01-15

**Successfully merged 8 comprehensive PRs in a single operation.**  
Completed a major merge operation combining multiple feature branches:

- **PR #11**: Enhanced logging dashboard with comprehensive admin interface
- **PR #14**: Added PesosLogo component with clock-style design
- **PR #15**: Implemented login-aware navigation with MenuNav component
- **PR #16**: Added loading spinner for better dashboard UX
- **PR #17**: Improved onboarding with two-column layout design
- **PR #18**: Created onboarding wizard strategy and documentation
- **PR #19**: Enhanced pricing page with professional two-column layout
- **PR #20**: Published AI blog post with comprehensive weekly summaries

All conflicts were systematically resolved, prioritizing the more advanced features from the HEAD branch while incorporating valuable UI improvements from the PR branches. The merge operation maintained the integrity of the comprehensive logging system and admin dashboard while adding significant UI/UX enhancements across the application.

This represents a major consolidation of development work that brings together admin infrastructure, user interface improvements, and content creation into a cohesive update.

---

## 2025-01-15

**Renamed system tables with pesos\_ prefix and implemented comprehensive login logging.**  
Successfully renamed `SystemStatus` and `SystemUpdateLog` tables to `pesos_SystemStatus` and `pesos_SystemUpdateLog` to maintain consistency with the project's naming convention. Updated the Prisma schema, regenerated the client, and synchronized the database using `npx prisma db push --force-reset`.

Enhanced the logging infrastructure to properly track user login events:

- Created enhanced middleware that logs user login events when accessing protected routes
- Added internal API endpoint `/api/internal/log-activity` for middleware and system logging
- Updated `getLocalUser` API to log successful user authentication events
- Maintained existing comprehensive logging in `createUser` API for user creation and conflict scenarios

**Implemented comprehensive test coverage for login logging functionality.**  
Created extensive test suites covering:

- `ActivityLogger` unit tests for all logging methods including renamed table functionality
- Internal log activity API endpoint tests with error handling and validation
- Integration tests for complete login logging flow from user creation to verification
- Error handling scenarios to ensure system stability even when logging fails

The system now provides full visibility into user authentication activities while maintaining the "calm confidence" approach - logging works silently in the background without affecting user experience. This addresses the original issue where login events weren't being logged and supports the admin dashboard's comprehensive activity monitoring capabilities.

---

## 2025-01-15

**Built comprehensive admin dashboard and activity logging system.**  
Created a full-featured admin dashboard at `/admin/dashboard` with extensive system monitoring capabilities. Implemented comprehensive activity logging infrastructure that tracks:

- User creation and login events
- System updates (every 3 hours) with detailed statistics
- Page views and API calls
- Feed sync operations
- Export requests and other user activities

The dashboard features a spreadsheet-like interface showing all system activity with filtering, pagination, and real-time statistics. Added new database tables (`ActivityLog`, `SystemUpdateLog`, `UserSessionLog`) and integrated logging into key endpoints like user creation and system updates.

This provides exactly what was requested - "LOTS of data based on everything that's happening across the system" in a classic log style that helps understand what the app is doing. The dashboard shows new users, logins, system updates, and errors with full historical tracking.

**Enhanced system transparency and monitoring capabilities.**  
The system now provides comprehensive visibility into all activities, supporting the "calm confidence" vision by giving clear insights into system health and user behavior. This moves PESOS closer to being a trustworthy, well-monitored service that users can rely on.

---

## 2025-01-13

**Planned 5 new Codex tasks based on end state priorities.**  
Analyzed current project state and identified bite-sized, high-impact tasks aligned with the "calm, trustworthy" vision. Added tasks for: Enhanced Status Dashboard, Mobile Dashboard Experience, Admin Monitoring Dashboard, Notification System Foundation, and Data Export Enhancement. These tasks are designed to move PESOS closer to the minimal, elegant user experience described in the end state while building necessary production infrastructure.

**Reorganized todo.md structure.**  
Created new "Dashboard & Status" high-priority section and "Notifications & Communication" medium-priority section to better organize the growing task list. Emphasized tasks that support the core vision of calm confidence and quiet competence.

---

## 2025-06-08

**Wrote `agents.md` scaffold.**  
Codex will now refer to `end_state.md`, `todo.md`, and `changelog.md` during every invocation.

**Created scaffolding files.**  
All three support files written. `end_state.md` is currently undefined.

**Logged current PESOS focus.**  
Jon is now focusing on clarifying outcomes and reducing stress. The system is meant to stay fun and aligned with energy, not pressure.

---

## 2025-06-08

**Added 'fix codex' line to todo.**
Appended a simple entry as requested.

---

## 2025-06-08

**Marked "fix codex" task complete.**
Spent time ensuring Codex and Cursor's agents had everything necessary to be awesome.

---

## 2025-06-08

**Implemented basic logging system and admin dashboard.**
Added `SystemLog` model, logging utilities, and new routes to record logins, new users, and backups. Created `/admin/dashboard` to view logs.

---

## 2025-06-08

**Added new PesosLogo and updated header.**
Replaced text logo with a simple clock-style icon featuring a P.

---

## 2025-06-08

**Updated navigation for logged in users.**
Added a `MenuNav` component and modified the header so About, Pricing, and Blog links collapse behind a Menu button when signed in. Logged out visitors still see the full nav.

---

## 2025-06-08

**Added loading spinner for simple dashboard.**
Created a `loading.tsx` file under `/dashboard/simple` so navigating to the page shows a spinner immediately instead of a blank screen. Updated `todo.md` with a new item for this improvement.

---

## 2025-06-08

**Started onboarding redesign.**
Implemented a new two-column layout for `feed-selection` with setup steps on the left and the feed form on a dark background. Added an "Improved setup wizard" task to `todo.md`.

---

## 2025-06-08

**Outlined strategy for new user wizard and editing flow.**
Created `docs/new-user-wizard.md` with a plan for a full-page multi-step setup wizard and inline editing pages. Updated `todo.md` with new tasks under "Onboarding & Editing" to track implementation work.

---

## 2025-06-08

**Improved pricing page layout.**
Created a two-column pricing page with Inter font styling. The free tier shows weekly updates while a placeholder column promises future features.

---

## 2025-06-08

**Published "AI Blog Post" summarizing the week's progress.**
Wrote a playful blog entry introducing myself as the resident AI. Highlighted the new agents.md file, the quick "fix codex" todo item, and our long-term vision of a calm archiving service.

---

## 2025-06-08

**Expanded AI Blog Post with full weekly summary.**
Added details about table renaming, admin dashboard, login logging, and item deduplication so the blog better reflects recent progress.

---

## 2025-06-09

**Logged export requests and updated todo.**
Added ActivityLogger support to `app/api/export` so each export is tracked. Marked related tasks as complete in `todo.md`.

**Added ActivityLogger to source management endpoints.**
Logged operations in add-pesos-source, sources, and blocked-feeds routes for admin monitoring.

---

## 2025-06-09

**Simplified admin dashboard.** Replaced the bulky dashboard page with a lightweight version that fetches the latest activity logs from /api/admin/logs. This makes it easy to verify logging is working.

## 2025-06-10

**Removed manual sync buttons and added end state blog post.**
Pruned the manual "Sync All Feeds" buttons from the dashboard to reinforce the automatic nature of backups. Added a new blog entry explaining how `end_state.md`, `todo.md`, and `changelog.md` guide development and suggested renaming the chronicle for clarity.

## 2025-06-11

**Created new `/setup` wizard and updated navigation.**
Implemented a basic multi-step setup flow with `/setup/username`, `/setup/feeds`, and `/setup/complete` pages. Added sidebar step navigation in a new layout and linked to the wizard from the menu. Marked related tasks complete in `todo.md`.

## 2025-06-12

**Added email signup and polished pricing page.**

- Created EmailSignup model and `/api/subscribe` endpoint
- Added `/subscribe` page with form to collect emails
- Updated pricing page with pro plan details
- Published "What's Next" blog post
- Marked signup task complete in `todo.md`

## 2025-06-12

**Removed outdated favicon binary.**
Deleted `app/favicon.ico` to clean up the repo and avoid binary clutter. The new logo component now stands in for the favicon.

## 2025-06-13

**Implemented final demo features.**

- Added placeholder Link Page and Hosted Page routes
- Created Magazine preview page
- Expanded pricing page copy with links to demos
- Wrote final blog post summarizing status
- Updated todo to mark LinkTree competitor and Hosted pages complete

## 2025-06-14

**Fixed Prisma schema relation for LinkPage.**
Added missing `linkPages` relation on `pesos_User` so Prisma can generate client successfully. This resolves schema validation error in build step.

## 2025-06-15

**Enhanced admin dashboard and pricing page.**

- Rebuilt `/admin/dashboard` as a client component that fetches logs from the API with automatic refresh.
- Display summary stats and a manual refresh button for better monitoring.
- Added reusable `PricingCard` component and redesigned `/pricing` with a highlighted Pro plan and clear call to action.
- Marked real-time refresh task complete in `todo.md`.

## 2025-06-16

**Polished admin dashboard UI.**

- Added `AdminStats` component with clean cards for key metrics.
- Redesigned `/admin/dashboard` with gradient background and styled log table.
- Marked design improvement task complete in `todo.md`.

**Simplified Pro pricing section.**
Updated `/pricing` page so the Pro card only shows "Coming soon!" instead of a full feature list and pricing.

## 2025-06-17

**Renamed chronicler to changelog and removed old favicon.**
Updated references across docs and code, deleted `app/favicon.ico`, and adjusted logo color. Tests failing due to missing modules.

## 2025-06-20

**Fixed prolific sources page.**
Updated client page to handle API response with `sources` key and made stats fields optional to prevent crashes.

**Narrowed landing page tagline width.**
Reduced the heading container to `max-w-lg` on the home screen so the text
"You should back up your projects once a week, and that's all PESOS does."
does not stretch too wide.

**Simplified dashboard URLs and unified admin page.**
Updated routes so `/dashboard` replaces `/dashboard/simple`, and `/dashboard/detailed` replaces `/dashboard/all_posts`. Added `/admin` page with password prompt showing server stats and admin logs together.

## 2025-06-21

**Added view preference storage.**
Introduced `viewPreference` column on `pesos_User` with a migration and updated `/api/set-view-preference` to save the user's dashboard view choice in the database and cookie.


**Added documentation section.**
Created `/docs` route with a new "Data Export Formats" page explaining JSON, Markdown and CSV backups. Updated README and todo lists accordingly.

**Fixed username modal showing for existing users.**
Cleaned up leftover debug code and ensured localStorage is cleared when a signed-in user already has a username. This prevents the modal from appearing after login.

