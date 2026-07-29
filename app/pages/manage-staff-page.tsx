"use client";

import { useEffect, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

type StaffMember = {
  id: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "CASHIER";
  isActive: boolean;
};

export default function ManageStaffPage() {
  const { setCurrentPage } = usePageContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/staff", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load staff");
      }
      setStaff(data as StaffMember[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadStaff();
    };
    void run();
  }, []);

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role, sendInvite }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to add staff member");
      }
      setEmail("");
      setRole("CASHIER");
      setSendInvite(true);
      setAddOpen(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to update staff member");
      }
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update staff member",
      );
    }
  };

  return (
    <MobilePageWrapper
      title="Manage Staff"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1 }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading staff...
            </Typography>
          ) : (
            <List sx={{ px: 0 }}>
              {staff.map((member) => (
                <ListItem
                  key={member.id}
                  divider
                  secondaryAction={
                    <Switch
                      checked={member.isActive}
                      onChange={() => void handleToggleActive(member)}
                      disabled={member.role === "OWNER"}
                    />
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1">
                          {member.displayName || member.email}
                        </Typography>
                        <Chip
                          size="small"
                          label={member.role === "OWNER" ? "Owner" : "Cashier"}
                          color={member.role === "OWNER" ? "primary" : "default"}
                        />
                      </Stack>
                    }
                    secondary={member.email}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Button
            variant="outlined"
            startIcon={<AddRounded fontSize="small" />}
            onClick={() => setAddOpen(true)}
          >
            Add Staff
          </Button>
        </Stack>
      </Container>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Staff</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "OWNER" | "CASHIER")
              }
              fullWidth
            >
              <MenuItem value="CASHIER">Cashier</MenuItem>
              <MenuItem value="OWNER">Owner</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={sendInvite}
                  onChange={(event) => setSendInvite(event.target.checked)}
                />
              }
              label="Email an invite (skip if they'll sign in with Google)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={saving || !email.trim()}
          >
            {saving ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </MobilePageWrapper>
  );
}
