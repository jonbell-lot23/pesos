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

### Dashboard & Status (New Priority)

- [ ] **Enhanced Status Dashboard** - Improve main dashboard with calm confidence
  - [ ] Queue status display ("5 items queued, processing in 2 hours")
  - [ ] Last backup timestamp with friendly language
  - [ ] System health indicators
  - [ ] Remove manual fetch buttons (per end state requirements)

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
- [x] Logging system
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
- [ ] Testing
  - [ ] Unit tests for feed processing
  - [ ] Integration tests for user flows
  - [ ] End-to-end testing
- [x] Fix codex

## New Admin Infrastructure Tasks

- [ ] **Integrate logging into more endpoints**
  - [ ] Add logging to source management endpoints
  - [ ] Add logging to export functionality
  - [ ] Add logging to backup creation
  - [ ] Add page view tracking middleware

- [ ] **Admin Dashboard Enhancements**
  - [ ] Add real-time refresh capability
  - [ ] Add data export from admin dashboard
  - [ ] Add user lookup and management features
  - [ ] Add system health monitoring alerts
