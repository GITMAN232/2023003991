export function formatNotificationTimestamp(rawTimestamp) {
  if (!rawTimestamp) return "-";

  const timestampText = String(rawTimestamp).trim();
  const normalizedTimestamp = timestampText.includes("T")
    ? timestampText
    : timestampText.replace(" ", "T");
  const parsed = new Date(normalizedTimestamp);

  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
