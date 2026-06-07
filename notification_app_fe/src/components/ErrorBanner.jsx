import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

export function ErrorBanner({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null
      }
    >
      {message}
    </Alert>
  );
}
