import { MuiThemeProvider } from "@/app/providers/mui-theme";
import { AppShell } from "@/components/AppShell";
import { CssBaseline } from "@mui/material";

export const metadata = {
  title: "Campus Notification System",
  description: "Notification management platform with priority-based ranking",
  openGraph: {
    title: "Campus Notification System",
    description: "Notification management platform",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <MuiThemeProvider>
          <CssBaseline />
          <AppShell>{children}</AppShell>
        </MuiThemeProvider>
      </body>
    </html>
  );
}
