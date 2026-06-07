"use client";

import { useState } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress
} from "@mui/material";
import NotificationCard from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";

export default function PriorityPage() {
  const [type, setType] = useState("");

  const { notifications, isLoading, error } = useNotifications({
    page: 1,
    limit: 100, // Fetch ample records so client/heap manager can rank
    topN: 5,    // Standard top 5 for priority page as requested in Step 18
    notificationType: type,
  });

  return (
    <Container sx={{ mt: 4, maxWidth: "760px !important" }}>
      <Box sx={{ borderBottom: "2px solid #f6f6f6", pb: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#0f172a" }}>
          Priority Notifications
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, fontSize: "0.95rem" }}>
          Stage 2 - Priority Filter
        </Typography>
      </Box>

      <Select
        value={type}
        onChange={(e) => setType(e.target.value)}
        fullWidth
        displayEmpty
        sx={{
          mb: 4,
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          color: "#334155",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#e2e8f0"
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#3b82f6"
          }
        }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="Event">Event</MenuItem>
        <MenuItem value="Result">Result</MenuItem>
        <MenuItem value="Placement">Placement</MenuItem>
      </Select>

      <Box component="main">
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={30} />
            <Typography sx={{ color: "#94a3b8", ml: 2, fontSize: "0.95rem" }}>
              Syncing telemetry datastream...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : notifications.length === 0 ? (
          <Typography sx={{ color: "#94a3b8", textAlign: "center", py: 4 }}>
            No priority notifications found.
          </Typography>
        ) : (
          notifications.map((item, i) => {
            const itemId = item.ID || item.id;
            return (
              <NotificationCard
                key={itemId || `notif-${i}`}
                item={item}
                viewed={true}
              />
            );
          })
        )}
      </Box>
    </Container>
  );
}
