"use client";

import { MuiThemeProvider } from "@/app/providers/mui-theme";
import { AppShell } from "@/components/AppShell";
import { CssBaseline } from "@mui/material";

export const metadata = {
  title: "Notification App",
  description: "Campus Notification System - Stage 1 & 2",
  openGraph: {
    title: "Notification App",
    description: "Campus Notification System",
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
