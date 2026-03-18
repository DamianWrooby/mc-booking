# MC Booking

**Job & event scheduling platform for teams** — plan assignments, track availability, and keep everyone on the same page.

<div align="center">
  <img src="docs/screenshots/calendar-view.png" alt="MC Booking — calendar view with upcoming events" width="300" />
</div>

## What is MC Booking?

MC Booking is a web application designed for organizations that need to coordinate people across jobs, events, and locations. It provides a shared calendar where managers can create assignments, team members can declare their availability, and everyone has real-time visibility into the schedule.

### Key features

- **Interactive calendar** — browse upcoming events by month with highlighted active days
- **Job management** — create, edit, and track job assignments with location and date range details
- **Availability declarations** — team members submit their available dates so managers can plan ahead
- **Role-based access** — separate views and permissions for administrators, managers, and team members
- **Reports** — generate summaries of assignments and activity
- **Notifications** — stay informed about schedule changes in real time
- **Mobile-first design** — optimized for phones with installable PWA support, works offline
- **Dark mode** — easy on the eyes, day or night

## Who is it for?

MC Booking is built for any team that schedules people for on-site work — event crews, service companies, field teams, or freelance collectives. If you need a simple, shared view of "who is where and when," this is it.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, TypeScript, TailwindCSS 4 |
| UI components | PrimeNG |
| Backend & auth | Supabase (PostgreSQL, Auth, RLS) |
| Deployment | PWA-ready, service worker enabled |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- npm (included with Node.js)

### Installation

```bash
git clone <repository-url>
cd mc-booking
npm install
```

### Development

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser. The app reloads automatically on code changes.

### Production build

```bash
npm run build
```

Build artifacts are output to the `dist/` directory.

### Tests

```bash
npm test
```

## License

Private project. All rights reserved.
