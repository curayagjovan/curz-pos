"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

type ListEmptyStateProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
};

export default function ListEmptyState({
  title = "Nothing here yet",
  description,
  icon,
}: ListEmptyStateProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 2.5 }}>
        <Stack
          spacing={icon ? 1.25 : 0.5}
          alignItems={icon ? "center" : "stretch"}
          textAlign={icon ? "center" : "left"}
        >
          {icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.08),
                color: "text.secondary",
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
