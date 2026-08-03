"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import StaffAddDialog from "@/app/components/staff-add-dialog";
import StaffDeactivateDialog from "@/app/components/staff-deactivate-dialog";
import StaffEditDialog from "@/app/components/staff-edit-dialog";
import StaffList from "@/app/components/staff-list";
import { useStaffManagement } from "@/app/hooks/use-staff-management";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function ManageStaffPage() {
  const { setCurrentPage } = usePageContext();
  const {
    staff,
    loading,
    error,
    addOpen,
    setAddOpen,
    email,
    setEmail,
    emailError,
    setEmailError,
    role,
    setRole,
    sendInvite,
    setSendInvite,
    saving,
    handleAdd,
    handleSwitchActive,
    editTarget,
    setEditTarget,
    editDisplayName,
    setEditDisplayName,
    editRole,
    setEditRole,
    editPermissions,
    editSaving,
    editError,
    handleOpenEdit,
    handleTogglePermission,
    handleSaveEdit,
    isSoleActiveOwner,
    deactivateTarget,
    setDeactivateTarget,
    deactivating,
    handleConfirmDeactivate,
  } = useStaffManagement();

  return (
    <MobilePageWrapper
      title="Manage Staff"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1 }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <StaffList
            staff={staff}
            loading={loading}
            onEdit={handleOpenEdit}
            onSwitchActive={handleSwitchActive}
          />

          <Button
            variant="outlined"
            startIcon={<AddRounded fontSize="small" />}
            onClick={() => setAddOpen(true)}
          >
            Add Staff
          </Button>
        </Stack>
      </Container>

      <StaffAddDialog
        open={addOpen}
        email={email}
        onEmailChange={(value) => {
          setEmail(value);
          setEmailError(null);
        }}
        emailError={emailError}
        role={role}
        onRoleChange={setRole}
        sendInvite={sendInvite}
        onSendInviteChange={setSendInvite}
        saving={saving}
        onClose={() => {
          setAddOpen(false);
          setEmailError(null);
        }}
        onSubmit={() => void handleAdd()}
      />

      <StaffEditDialog
        target={editTarget}
        displayName={editDisplayName}
        onDisplayNameChange={setEditDisplayName}
        role={editRole}
        onRoleChange={setEditRole}
        permissions={editPermissions}
        onTogglePermission={handleTogglePermission}
        isSoleActiveOwner={Boolean(isSoleActiveOwner)}
        saving={editSaving}
        error={editError}
        onClose={() => setEditTarget(null)}
        onSubmit={() => void handleSaveEdit()}
      />

      <StaffDeactivateDialog
        target={deactivateTarget}
        deactivating={deactivating}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void handleConfirmDeactivate()}
      />
    </MobilePageWrapper>
  );
}
