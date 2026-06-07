"use client";

import HomeIcon from "@mui/icons-material/Home";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Home", icon: <HomeIcon fontSize="small" /> },
  {
    href: "/priority",
    label: "Priority",
    icon: <PriorityHighIcon fontSize="small" />,
  },
];

export function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="sticky"
        sx={{ borderBottom: "1px solid #e4e7ec" }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 72 }}>
            <Typography
              component="div"
              variant="h6"
              fontWeight={700}
              sx={{ flexGrow: 1 }}
            >
              Notification App
            </Typography>
            <Stack direction="row" spacing={1}>
              {navigationItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname === item.href;

                return (
                  <Button
                    key={item.href}
                    LinkComponent={Link}
                    href={item.href}
                    startIcon={item.icon}
                    variant={isActive ? "contained" : "text"}
                    color={isActive ? "primary" : "inherit"}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}
