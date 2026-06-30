import ProductsList from "@/app/components/products-list";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function ProductsPage() {
  return (
    <MobilePageWrapper title="Products">
      <ProductsList />
    </MobilePageWrapper>
  );
}
