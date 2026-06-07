"use client";

import { useState } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  Box,
  Stack,
  Alert,
  CircularProgress
} from "@mui/material";
import NotificationCard from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";

export default function Home() {
  const [clearedSet, setClearedSet] = useState(new Set());
  const [type, setType] = useState("");
  const [limit, setLimit] = useState(10);

  const { notifications, isLoading, error } = useNotifications({
    page: 1,
    limit: 100, // Fetch ample records so client/heap manager can rank
    topN: limit,
    notificationType: type,
  });

  const executeClearAction = (id) => {
    setClearedSet((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      return updated;
    });
  };

  return (
    <Container sx={{ mt: 4, maxWidth: "760px !important" }}>
      <Box sx={{ borderBottom: "2px solid #f6f6f6", pb: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#0f172a" }}>
          Notification Terminal
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, fontSize: "0.95rem" }}>
          Stage 2 - Active Streams
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          fullWidth
          displayEmpty
          sx={{
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
          <MenuItem value="">All Streams</MenuItem>
          <MenuItem value="Event">Events</MenuItem>
          <MenuItem value="Result">Results</MenuItem>
          <MenuItem value="Placement">Placements</MenuItem>
        </Select>

        <Select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          fullWidth
          sx={{
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
          <MenuItem value={5}>Display Limit: 5</MenuItem>
          <MenuItem value={10}>Display Limit: 10</MenuItem>
          <MenuItem value={20}>Display Limit: 20</MenuItem>
        </Select>
      </Stack>

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
            No notifications available.
          </Typography>
        ) : (
          notifications.map((item, i) => {
            const itemId = item.ID || item.id;
            return (
              <NotificationCard
                key={itemId || `notif-${i}`}
                item={item}
                viewed={clearedSet.has(itemId)}
                onAcknowledge={() => executeClearAction(itemId)}
              />
            );
          })
        )}
      </Box>
    </Container>
  );
}
