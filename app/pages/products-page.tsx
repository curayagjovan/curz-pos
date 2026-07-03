import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import PagePlaceholder from "@/app/components/page-placeholder";

export default function ProductsPage() {
  return (
    <MobilePageWrapper title="Products">
      <PagePlaceholder
        heading="Product Catalog"
        subtitle="Products view is reset and ready for MUI list and search components."
      />
    </MobilePageWrapper>
  );
}
