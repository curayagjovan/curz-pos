import PagePlaceholder from "@/app/components/page-placeholder";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function InventoryPage() {
  return (
    <MobilePageWrapper title="Inventory">
      <PagePlaceholder
        heading="Inventory"
        subtitle="Inventory page is reset and ready for stock controls and adjustments."
      />
    </MobilePageWrapper>
  );
}
