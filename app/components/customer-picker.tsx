"use client";

import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import type { Customer } from "@/types/customer";

type CustomerPickerProps = {
  customers: Customer[];
  value: string | null;
  onChange: (customerId: string | null) => void;
  onCreateCustomer: (input: {
    name: string;
    phone?: string;
  }) => Promise<Customer | null>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

// Shared by the checkout drawer's "Pending" popover and the Sales page's
// per-sale customer assignment — an Autocomplete over the customer roster
// plus an inline "add new customer" dialog, so both flows behave and look
// identical.
export default function CustomerPicker({
  customers,
  value,
  onChange,
  onCreateCustomer,
  label,
  placeholder,
  required = false,
  disabled = false,
}: CustomerPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = customers.find((customer) => customer.id === value) ?? null;

  const handleOpenDialog = () => {
    setName("");
    setPhone("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (creating) {
      return;
    }
    setDialogOpen(false);
  };

  const handleConfirm = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setCreating(true);
    const created = await onCreateCustomer({
      name: trimmedName,
      phone: phone.trim() || undefined,
    });
    setCreating(false);

    if (created) {
      onChange(created.id);
      setDialogOpen(false);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Autocomplete
          fullWidth
          size="small"
          options={customers}
          value={selected}
          onChange={(_event, nextValue) => onChange(nextValue?.id ?? null)}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, optionValue) =>
            option.id === optionValue.id
          }
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              required={required}
            />
          )}
        />
        <IconButton
          onClick={handleOpenDialog}
          aria-label="add new customer"
          disabled={disabled}
          sx={{ mt: label ? 0.5 : 0 }}
        >
          <PersonAddAlt1Rounded fontSize="small" />
        </IconButton>
      </Stack>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>New Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5, minWidth: 260 }}>
            <TextField
              autoFocus
              fullWidth
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              fullWidth
              label="Phone (optional)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!name.trim() || creating}
            onClick={() => void handleConfirm()}
          >
            {creating ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
