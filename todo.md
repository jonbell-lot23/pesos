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

## Medium Priority

### Mobile Experience

- [ ] Design and implement mobile interface
  - [ ] Background image system
  - [ ] Status text display
  - [ ] Minimal UI components
- [ ] Create mobile-optimized views
  - [ ] Dashboard
  - [ ] Settings
  - [ ] Feed management

### Admin Features

- [ ] Basic admin dashboard
  - [ ] System status monitoring
  - [ ] User management
  - [ ] Log viewing
- [ ] Logging system
  - [ ] Backup logs
  - [ ] Queue logs
  - [ ] Error tracking

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
