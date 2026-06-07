import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getNotificationType } from "@/app/utils/notification-types";
import { formatNotificationTimestamp } from "@/app/utils/time-format";

function getTitle(notification) {
  return (
    notification?.title ||
    notification?.Title ||
    notification?.subject ||
    notification?.heading ||
    notification?.notification_title ||
    "Notification"
  );
}

function getMessage(notification) {
  return (
    notification?.message ||
    notification?.Message ||
    notification?.description ||
    notification?.body ||
    notification?.content ||
    "No message provided."
  );
}

function getTimestamp(notification) {
  return (
    notification?.timestamp ||
    notification?.Timestamp ||
    notification?.created_at ||
    notification?.createdAt ||
    notification?.date
  );
}

export function NotificationCard({ notification }) {
  const type = getNotificationType(notification);

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ justifyContent: "space-between" }}
          >
            <Typography component="h2" variant="h6" fontWeight={700}>
              {getTitle(notification)}
            </Typography>
            <Chip label={type} size="small" color="primary" />
          </Stack>
          <Typography color="text.secondary">
            {getMessage(notification)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AccessTimeIcon color="action" fontSize="small" />
            <Typography color="text.secondary" variant="body2">
              {formatNotificationTimestamp(getTimestamp(notification))}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
