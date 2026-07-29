"use client";

import { useEffect, useState } from "react";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

type AuditLogChanges = Record<string, { before: unknown; after: unknown }>;

type AuditLogEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  summary: string;
  changes: AuditLogChanges | null;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function AuditLogPage() {
  const { setCurrentPage } = usePageContext();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPage = async (cursor: string | null) => {
    const params = new URLSearchParams({ take: "50" });
    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetch(`/api/audit-log?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Unable to load audit trail");
    }
    return data as {
      items: AuditLogEntry[];
      hasMore: boolean;
      nextCursor: string | null;
    };
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadPage(null);
        setEntries(data.items);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load audit trail",
        );
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const data = await loadPage(nextCursor);
      setEntries((current) => [...current, ...data.items]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load audit trail",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <MobilePageWrapper
      title="Audit Trail"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1, pb: 4 }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading audit trail...
            </Typography>
          ) : entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity recorded yet.
            </Typography>
          ) : (
            <List sx={{ px: 0 }}>
              {entries.map((entry) => {
                const hasChanges =
                  entry.changes !== null &&
                  Object.keys(entry.changes).length > 0;
                const isExpanded = expandedId === entry.id;

                return (
                  <ListItem
                    key={entry.id}
                    divider
                    alignItems="flex-start"
                    secondaryAction={
                      hasChanges ? (
                        <IconButton
                          onClick={() =>
                            setExpandedId(isExpanded ? null : entry.id)
                          }
                          sx={{
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 150ms ease",
                          }}
                        >
                          <ExpandMoreRounded fontSize="small" />
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1">
                            {entry.summary}
                          </Typography>
                          <Chip size="small" label={entry.entityType} />
                        </Stack>
                      }
                      secondary={
                        <>
                          {dateFormatter.format(new Date(entry.createdAt))}
                          {" · "}
                          {entry.actorEmail ?? "System"}
                          {hasChanges ? (
                            <Collapse in={isExpanded} unmountOnExit>
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: "action.hover",
                                }}
                              >
                                {Object.entries(entry.changes ?? {}).map(
                                  ([field, { before, after }]) => (
                                    <Typography
                                      key={field}
                                      variant="caption"
                                      component="div"
                                    >
                                      <strong>{field}</strong>:{" "}
                                      {formatValue(before)} →{" "}
                                      {formatValue(after)}
                                    </Typography>
                                  ),
                                )}
                              </Box>
                            </Collapse>
                          ) : null}
                        </>
                      }
                      secondaryTypographyProps={{ component: "div" }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}

          {hasMore ? (
            <Button
              variant="outlined"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </Stack>
      </Container>
    </MobilePageWrapper>
  );
}
