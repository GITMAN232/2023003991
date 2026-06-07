"use client";

import * as React from "react";
import { MuiThemeProvider } from "./mui-theme";

export function RootProviders({ children }) {
  return <MuiThemeProvider>{children}</MuiThemeProvider>;
}

