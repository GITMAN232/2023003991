"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LoadingState } from "@/components/LoadingState";
import { NotificationCard } from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";

export default function Home() {
  const { error, isLoading, notifications, refetch, stats, summary } =
    useNotifications({
      page: 1,
      limit: 100,
      topN: 10,
    });

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography component="h1" variant="h4" fontWeight={700}>
              Top unread notifications
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Showing the highest-priority unread updates from the API.
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={refetch}
            disabled={isLoading}
          >
            Retry
          </Button>
        </Box>

        <DashboardSummary summary={summary} isLoading={isLoading} />
        {!isLoading ? (
          <Typography color="text.secondary" variant="body2">
            Processed {stats.processed ?? 0}, rejected {stats.rejected ?? 0},
            retained {stats.retained ?? 0}.
          </Typography>
        ) : null}
        {error ? <ErrorBanner message={error} onRetry={refetch} /> : null}

        {isLoading ? (
          <LoadingState />
        ) : (
          <Stack spacing={2}>
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <NotificationCard
                  key={notification.id ?? notification.notification_id ?? index}
                  notification={notification}
                />
              ))
            ) : (
              <Typography color="text.secondary">
                No notifications found.
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </AppShell>
  );
}
