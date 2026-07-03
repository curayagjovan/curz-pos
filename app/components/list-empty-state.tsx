"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type ListEmptyStateProps = {
  title?: string;
  description: string;
};

export default function ListEmptyState({
  title = "Nothing here yet",
  description,
}: ListEmptyStateProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 2.5 }}>
        <Stack spacing={0.5}>
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
