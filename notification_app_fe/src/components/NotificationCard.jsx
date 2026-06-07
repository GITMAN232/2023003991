"use client";

import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Button
} from "@mui/material";

export default function NotificationCard({
  item,
  viewed,
  notification,
  onAcknowledge
}) {
  const displayItem = item || notification;
  if (!displayItem) return null;

  const id = displayItem.ID || displayItem.id;
  const type = displayItem.Type || displayItem.type || displayItem.notification_type || "Notification";
  const message = displayItem.Message || displayItem.message || "No message content";
  const timestamp = displayItem.Timestamp || displayItem.timestamp || "";

  const isViewed = viewed !== undefined ? viewed : false;

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        borderLeft: isViewed ? "1px solid #e2e8f0" : "5px solid #2952cc",
        boxShadow: isViewed ? "none" : "0 4px 12px rgba(41, 82, 204, 0.06)",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        overflow: "hidden"
      }}
    >
      <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, p: "24px !important" }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}
            >
              {type}
            </Typography>
            {!isViewed && (
              <Chip
                label="NEW"
                color="primary"
                size="small"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 850,
                  height: "20px",
                  borderRadius: "4px",
                  backgroundColor: "#2952cc",
                  color: "#ffffff"
                }}
              />
            )}
          </Box>

          <Typography
            sx={{
              color: isViewed ? "#64748b" : "#1e293b",
              fontSize: "1rem",
              fontWeight: isViewed ? 400 : 500,
              lineHeight: 1.5,
              margin: 0
            }}
          >
            {message}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#94a3b8",
              display: "block",
              mt: "8px",
              fontSize: "0.8rem"
            }}
          >
            {timestamp}
          </Typography>
        </Box>

        {!isViewed && onAcknowledge && (
          <Button
            variant="outlined"
            onClick={onAcknowledge}
            sx={{
              borderColor: "#2952cc",
              color: "#2952cc",
              fontWeight: 600,
              fontSize: "0.85rem",
              textTransform: "none",
              borderRadius: "6px",
              px: 2,
              py: 1,
              "&:hover": {
                backgroundColor: "#eff6ff",
                borderColor: "#2952cc"
              }
            }}
          >
            Acknowledge
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
