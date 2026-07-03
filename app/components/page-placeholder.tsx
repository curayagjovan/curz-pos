"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type PagePlaceholderProps = {
  heading?: string;
  subtitle?: string;
};

export default function PagePlaceholder({
  heading = "Coming Soon",
  subtitle = "This page is ready for the next feature implementation.",
}: PagePlaceholderProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {heading}
        </Typography>

        <Card variant="outlined">
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
