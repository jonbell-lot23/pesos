# New User Wizard & Editing Flow Strategy

## Goals
- Provide a mobile-friendly onboarding experience.
- Allow returning users to edit sections without disruptive modals.
- Keep the interface clean and in line with PESOS's calm, trustworthy vision.

## Proposed Approach
1. **Multi-Step Wizard Page**
   - Instead of a modal, route new users to `/setup` after account creation.
   - Each step occupies the full page with a progress indicator at the top.
   - Steps:
     1. Choose Username
     2. Add Projects/Feeds
     3. Confirm Schedule & Notifications
     4. Setup Complete
   - On mobile, each step stacks vertically with large touch targets.
   - On desktop, optional sidebar shows upcoming steps.

2. **Inline Editing for Existing Users**
   - Replace modal feed editor with dedicated pages like `/settings/feeds`.
   - Accessed via a sidebar or settings icon on the dashboard.
   - Each section (Profile, Feeds, Notifications) is a page with forms that save instantly.
   - Use drawers or expandable sections on mobile for compactness.

3. **Persistent Sidebar Navigation**
   - On wider screens, show a left sidebar with key sections:
     - Dashboard
     - Projects/Feeds
     - Account Settings
     - Data Export
   - On mobile, collapse into a hamburger menu that slides over the content.

4. **Getting Back to the Wizard**
   - Progress is stored in localStorage or the database.
   - Users can resume setup by visiting `/setup` at any time.
   - Each step can be revisited to update information.

5. **Visual Style**
   - Minimal, airy design matching the rest of PESOS.
   - Avoid heavy borders; use subtle shadows and clean typography.
   - Animations should be calm and quick (e.g., fade transitions between steps).

## Next Steps
- Implement `/setup` route with step framework.
- Migrate username and feed selection modals into wizard pages.
- Create settings pages for feeds and profile management.
- Update navigation to include sidebar on desktop and slide-out menu on mobile.

