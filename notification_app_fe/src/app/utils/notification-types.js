export const NOTIFICATION_PRIORITY = {
  Event: 1,
  Result: 2,
  Placement: 3,
};

export const SUPPORTED_NOTIFICATION_TYPES = [
  "Event",
  "Result",
  "Placement",
];

export function normalizeNotificationType(inputType) {
  // The evaluation API accepts an empty string to fetch all.
  if (inputType === null || inputType === undefined) return "";
  return String(inputType);
}

export function getNotificationType(notification) {
  return (
    notification?.type ||
    notification?.Type ||
    notification?.notification_type ||
    notification?.category ||
    "Other"
  );
}

