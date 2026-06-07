"use client";

import * as React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const notificationTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2952cc",
    },
    secondary: {
      main: "#0f766e",
    },
    background: {
      default: "#f6f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#172033",
      secondary: "#667085",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      "var(--font-geist-sans)",
      "Arial",
      "Helvetica",
      "sans-serif",
    ].join(","),
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e4e7ec",
          boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
        },
      },
    },
  },
});

export function MuiThemeProvider({ children }) {
  return (
    <ThemeProvider theme={notificationTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

