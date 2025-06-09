# TODO

A running list of tasks related to PESOS. May be edited by humans or agents.

## High Priority

### Authentication & Security

- [ ] Move Clerk.dev from dev mode to production mode
- [x] Basic email/password login
- [x] Optional email field for recovery
- [x] Session management
- [x] User profile creation and management

### Core Infrastructure

- [x] Database schema setup
  - [x] User profiles
  - [x] Feed connections
  - [x] Archived items
  - [x] Processing queue
  - [x] **System tables renamed with pesos_ prefix** - SystemStatus and SystemUpdateLog now properly named
- [x] Background job system
  - [x] Feed checking service (3-hour intervals)
  - [x] Queue management
  - [x] Processing status tracking

### Essential Features

- [x] Feed management system
  - [x] Feed validation
  - [x] Feed discovery
  - [x] Automatic updates
  - [x] Error handling
- [x] Data export functionality
  - [x] JSON export
  - [x] Markdown export
  - [x] CSV export

### Onboarding & Setup

- [ ] Improved setup wizard with side navigation

### Dashboard & Status (New Priority)

- [ ] **Enhanced Status Dashboard** - Improve main dashboard with calm confidence
  - [ ] Queue status display ("5 items queued, processing in 2 hours")
  - [ ] Last backup timestamp with friendly language
  - [ ] System health indicators
  - [ ] Remove manual fetch buttons (per end state requirements)
  - [x] Immediate loading spinner for `/dashboard/simple`

- [ ] **Data Export Enhancement** - Polish existing export functionality
  - [ ] Better export UI/UX
  - [ ] Export status tracking
  - [ ] Clear documentation of data formats
  - [ ] Preview before download

## Medium Priority

### Mobile Experience

- [ ] **Mobile Dashboard Experience** - Create minimal mobile interface
  - [ ] Simple background image system
  - [ ] Clean status text ("All good! 309 items stored. Last one 10 days ago")
  - [ ] Mobile-optimized dashboard view
  - [ ] "Postcard from your archive robot" feel
- [ ] Create mobile-optimized views
  - [ ] Dashboard
  - [ ] Settings
  - [ ] Feed management

### Onboarding & Editing

- [ ] Replace modal-based onboarding with `/setup` wizard
- [ ] Create dedicated settings pages for feeds and profile editing
- [ ] Add sidebar navigation with mobile slide-out menu
- [ ] Allow users to resume setup at any time

### Admin Features

- [x] **Admin Monitoring Dashboard** - Build foundational admin interface
  - [x] System status monitoring
  - [x] Basic user stats
  - [x] Processing queue visibility
  - [x] Error log viewing (verbose/diagnosable)
  - [x] Activity logging system
  - [x] Comprehensive spreadsheet-like view
  - [x] System update tracking
  - [x] User activity monitoring
- [x] **Comprehensive Logging System** - **COMPLETED**
  - [x] **Login event logging** - Now properly tracks user authentication
  - [x] **Database table consistency** - All system tables use pesos_ prefix
  - [x] **Enhanced middleware logging** - Logs page views and login events
  - [x] **Internal logging API** - Middleware can log activities via `/api/internal/log-activity`
  - [x] **Comprehensive test coverage** - Unit tests, integration tests, and error handling
  - [x] Backup logs
  - [x] Queue logs
  - [x] Error tracking
  - [x] User creation/login tracking
  - [x] Page view tracking
  - [x] API call tracking

### Notifications & Communication

- [ ] **Notification System Foundation** - Implement email/notification infrastructure
  - [ ] Optional email field in user profiles
  - [ ] Basic notification preferences
  - [ ] Email templates for backup success/failure
  - [ ] In-app notification system

## Future Features

### Paid Features

- [ ] LinkTree competitor
  - [ ] Custom landing page builder
  - [ ] Link management
  - [ ] Analytics
- [ ] Hosted pages
  - [ ] Markdown editor
  - [ ] Page hosting system
  - [ ] Custom domain support

### Optional Features

- [ ] PESOS Magazine
  - [ ] Public highlights system
  - [ ] Curation tools
  - [ ] Permissions model
- [ ] Enhanced notifications
  - [ ] Email notifications
  - [ ] Mobile push setup
  - [ ] In-app notifications

## Technical Debt

- [ ] Documentation
  - [ ] API documentation
  - [ ] User guides
  - [ ] Developer documentation
- [ ] Performance optimization
  - [ ] Database indexing
  - [ ] Caching strategy
  - [ ] Load testing
- [x] **Testing Infrastructure** - **COMPLETED**
  - [x] **Comprehensive activity logger tests**
  - [x] **API endpoint tests for internal logging**
  - [x] **Integration tests for login flow**
  - [x] **Error handling test coverage**
  - [ ] Unit tests for feed processing
  - [ ] Integration tests for user flows  
  - [ ] End-to-end testing
- [x] Fix codex
- [x] AI blog post summarizing weekly updates

## New Admin Infrastructure Tasks

- [x] **Integrate logging into more endpoints** - **COMPLETED**
  - [x] **Add logging to authentication endpoints** - getLocalUser now logs login events
  - [x] **Add comprehensive middleware logging** - Page views and login detection
  - [x] **Add login event detection** - Middleware detects and logs user logins
  - [ ] Add logging to source management endpoints
  - [x] Add logging to export functionality
  - [ ] Add logging to backup creation

- [ ] **Admin Dashboard Enhancements**
  - [ ] Add real-time refresh capability
  - [ ] Add data export from admin dashboard
  - [ ] Add user lookup and management features
  - [ ] Add system health monitoring alerts
