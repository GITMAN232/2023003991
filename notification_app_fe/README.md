# Notification App FE

Next.js and MUI frontend for viewing evaluation-service notifications.

## Features

- Home dashboard with notification counts and latest notifications.
- Priority page with Event, Result, and Placement filtering.
- Shared API client for notification fetches and evaluation-service logs.
- Loading skeletons, error banners, and retry actions.

## Environment

Create `.env.local` with:

```bash
EVALUATION_EMAIL=your_email
EVALUATION_NAME=your_name
EVALUATION_ROLL_NO=your_roll_number
EVALUATION_ACCESS_CODE=your_access_code
EVALUATION_CLIENT_ID=your_client_id
EVALUATION_CLIENT_SECRET=your_client_secret
```

The app exchanges these credentials for a bearer token on the server and uses
`Authorization: Bearer <token>` for evaluation-service requests.

## Commands

```bash
npm run dev
npm run lint
npm run build
```
