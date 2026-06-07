"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LoadingState } from "@/components/LoadingState";
import { NotificationCard } from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";

export default function HomePage() {
  const { notifications, isLoading, error, refetch, summary } = useNotifications({
    page: 1,
    limit: 100,
    topN: 50,
  });

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Overview of all notifications across the system.
        </Typography>
      </Stack>

      <DashboardSummary summary={summary} isLoading={isLoading} />

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {isLoading ? (
        <LoadingState />
      ) : notifications.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No notifications available.
        </Typography>
      ) : (
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            Recent Notifications ({notifications.length})
          </Typography>
          <Stack spacing={2}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id || notification.ID}
                notification={notification}
              />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
