# Quick Start Guide

## Campus Notification System - Frontend

Get the application running in 5 minutes.

## Prerequisites

- Node.js 18+ with npm
- `.env.local` file with `NEXT_PUBLIC_TOKEN` configured

## Setup Steps

### 1️⃣ Install Dependencies (1 minute)

```bash
npm install
```

### 2️⃣ Start Development Server (30 seconds)

```bash
npm run dev
```

Server starts at: **http://localhost:3000**

### 3️⃣ Access the Application

**Home Page (Dashboard)**
- URL: http://localhost:3000
- Shows all notifications
- Displays summary cards (Total, Event, Result, Placement)

**Priority Page (Filtered)**
- URL: http://localhost:3000/priority
- Shows top 10 prioritized notifications
- Filter by type using dropdown

## Troubleshooting

### "Module not found" error
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API 401 Unauthorized
- Check `.env.local` has valid `NEXT_PUBLIC_TOKEN`
- Verify token matches API requirements

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

## Available Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000

# Production
npm run build           # Build for production
npm start              # Start production server

# Quality
npm run lint           # Run ESLint checks
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/page.js` | Home page (dashboard) |
| `src/app/priority/page.js` | Priority page (top 10) |
| `src/hooks/useNotifications.js` | Data fetching hook |
| `src/services/NotificationService.js` | API integration |
| `src/services/PriorityNotificationManager.js` | Priority logic |
| `Notification_System_Design.md` | Architecture docs |

## Next Steps

1. Review [Notification_System_Design.md](./Notification_System_Design.md) for architecture
2. Check [README.md](./README.md) for complete documentation
3. Explore code in `src/` directory
4. Run `npm run build` to verify production build

## Support

- **Design Docs**: [Notification_System_Design.md](./Notification_System_Design.md)
- **API Info**: See `src/app/api/` for backend routes
- **Components**: Check `src/components/` for UI elements
- **Services**: View `src/services/` for business logic

---

**Ready?** Run `npm run dev` and start exploring! 🚀
