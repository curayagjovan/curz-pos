"use client";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

type ListSkeletonProps = {
  rows?: number;
  showAvatar?: boolean;
};

// Row-shaped placeholder for the first paint of any list — swapped in for
// a bare spinner so the loading state previews the content's layout
// instead of just signaling "wait".
export default function ListSkeleton({
  rows = 6,
  showAvatar = true,
}: ListSkeletonProps) {
  return (
    <List disablePadding aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <ListItem key={index} divider sx={{ py: 1.25 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ width: "100%" }}
          >
            {showAvatar ? (
              <Skeleton variant="rounded" width={34} height={34} />
            ) : null}
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="35%" height={16} />
            </Stack>
            <Skeleton variant="rounded" width={56} height={24} />
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
