"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import type { StaffMember } from "@/types/staff";

type StaffListProps = {
  staff: StaffMember[];
  loading: boolean;
  onEdit: (member: StaffMember) => void;
  onSwitchActive: (member: StaffMember) => void;
};

export default function StaffList({
  staff,
  loading,
  onEdit,
  onSwitchActive,
}: StaffListProps) {
  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <List sx={{ px: 0 }}>
      {staff.map((member) => (
        <ListItem
          key={member.id}
          divider
          sx={{ py: 1.25, pr: 14 }}
          secondaryAction={
            <Stack direction="row" spacing={1.25} alignItems="center">
              <IconButton
                size="small"
                onClick={() => onEdit(member)}
                aria-label={`edit ${member.email}`}
              >
                <EditRounded fontSize="small" />
              </IconButton>
              <Switch
                checked={member.isActive}
                onChange={() => onSwitchActive(member)}
                disabled={member.role === "OWNER"}
              />
            </Stack>
          }
        >
          <ListItemText
            sx={{ minWidth: 0 }}
            primary={
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body1" noWrap>
                    {member.displayName || member.email}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={member.role === "OWNER" ? "Owner" : "Cashier"}
                  color={member.role === "OWNER" ? "primary" : "default"}
                  sx={{ flexShrink: 0 }}
                />
              </Stack>
            }
            secondary={member.email}
          />
        </ListItem>
      ))}
    </List>
  );
}
