"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LoadingState } from "@/components/LoadingState";
import { NotificationCard } from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";

const notificationTypes = [
  { value: "", label: "All Types" },
  { value: "Placement", label: "Placement" },
  { value: "Result", label: "Result" },
  { value: "Event", label: "Event" },
];

export default function PriorityPage() {
  const [selectedType, setSelectedType] = useState("");
  const { notifications, isLoading, error, refetch } = useNotifications({
    page: 1,
    limit: 100,
    topN: 10,
    notificationType: selectedType,
  });

  const handleTypeChange = useCallback((event) => {
    setSelectedType(event.target.value);
  }, []);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Priority Notifications
        </Typography>
        <Typography color="text.secondary">
          Top 10 unread notifications ordered by priority (Placement → Result → Event) and timestamp.
        </Typography>
      </Stack>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Filter by Type</InputLabel>
        <Select value={selectedType} label="Filter by Type" onChange={handleTypeChange}>
          {notificationTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {isLoading ? (
        <LoadingState />
      ) : notifications.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No priority notifications found.
        </Typography>
      ) : (
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            Top Notifications ({notifications.length})
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
