"use client";

import Box from "@mui/material/Box";

// Plays once, on mount — the branch rendering this only mounts after a
// loading/spinner state resolves, so this animates that first appearance
// without any extra state to track "just finished loading".
export default function FadeInContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{ animation: "content-enter 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
    >
      {children}
    </Box>
  );
}
