import PagePlaceholder from "@/app/components/page-placeholder";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function SettingsPage() {
  return (
    <MobilePageWrapper title="Settings">
      <PagePlaceholder
        heading="Settings"
        subtitle="Settings page is reset and ready for system and account preferences."
      />
    </MobilePageWrapper>
  );
}
