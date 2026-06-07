import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function LoadingState() {
  return (
    <Stack spacing={2} aria-label="Loading notifications">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton height={28} width="70%" />
              <Skeleton height={20} width="95%" />
              <Skeleton height={20} width="45%" />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
