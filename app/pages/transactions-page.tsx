import PagePlaceholder from "@/app/components/page-placeholder";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function TransactionsPage() {
  return (
    <MobilePageWrapper title="Sales">
      <PagePlaceholder
        heading="Sales"
        subtitle="Sales page is reset and ready for transaction list and checkout flow."
      />
    </MobilePageWrapper>
  );
}
