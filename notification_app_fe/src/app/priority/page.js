"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LoadingState } from "@/components/LoadingState";
import { NotificationCard } from "@/components/NotificationCard";
import { SUPPORTED_NOTIFICATION_TYPES } from "@/app/utils/notification-types";
import { useNotifications } from "@/hooks/useNotifications";

export default function PriorityPage() {
  const [notificationType, setNotificationType] = useState("Event");
  const { error, isLoading, notifications, refetch } = useNotifications({
    page: 1,
    limit: 100,
    topN: 10,
    notificationType,
  });

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography component="h1" variant="h4" fontWeight={700}>
              Priority
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Filter the top unread notifications by category.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, minWidth: { sm: 320 } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="notification-type-label">Type</InputLabel>
              <Select
                labelId="notification-type-label"
                label="Type"
                value={notificationType}
                onChange={(event) => setNotificationType(event.target.value)}
              >
                {SUPPORTED_NOTIFICATION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              aria-label="Retry"
              variant="outlined"
              onClick={refetch}
              disabled={isLoading}
              sx={{ minWidth: 48 }}
            >
              <RefreshIcon fontSize="small" />
            </Button>
          </Box>
        </Box>

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
                No {notificationType.toLowerCase()} notifications found.
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </AppShell>
  );
}
