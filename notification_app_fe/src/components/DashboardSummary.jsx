import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

const summaryItems = [
  { key: "total", label: "Total" },
  { key: "Event", label: "Events" },
  { key: "Result", label: "Results" },
  { key: "Placement", label: "Placements" },
];

export function DashboardSummary({ summary, isLoading }) {
  return (
    <Grid container spacing={2}>
      {summaryItems.map((item) => (
        <Grid key={item.key} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {item.label}
              </Typography>
              {isLoading ? (
                <Skeleton height={44} width="55%" />
              ) : (
                <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                  {summary?.[item.key] ?? 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
