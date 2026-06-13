import { Affix, Card, Flex, Typography } from "antd";
import { SettingsDropdown } from "@/components/settings/settings-dropdown";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { ProductsSearchCard } from "@/components/pos/products-search-card";

type MobilePageHeaderProps = {
  mode: "light" | "dark";
  searchCardProps?: {
    search: string;
    productsCount: number;
    onSearchChange: (value: string) => void;
  };
};

export function MobilePageHeader({
  mode,
  searchCardProps,
}: MobilePageHeaderProps) {
  return (
    <Affix offsetTop={0} style={{ zIndex: 50 }}>
      <Card
        styles={{ body: { padding: "10px 14px" } }}
        style={{
          width: "100%",
          borderRadius: 0,
          paddingInline: 0,
          paddingTop: "calc(8px + env(safe-area-inset-top))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "none",
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          style={{ marginBottom: 8 }}
        >
          <Flex
            align="center"
            justify="space-between"
            className="mobile-page-header-brand"
          >
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 700,
                color: "var(--ant-color-primary)",
              }}
            >
              SAM
            </Typography.Title>
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 300,
              }}
            >
              SHOP
            </Typography.Title>
          </Flex>
          <Flex align="center" gap={8}>
            <InstallAppButton size="small" />
            <SettingsDropdown size="middle" />
          </Flex>
        </Flex>

        {searchCardProps ? (
          <ProductsSearchCard
            mode={mode}
            search={searchCardProps.search}
            productsCount={searchCardProps.productsCount}
            onSearchChange={searchCardProps.onSearchChange}
          />
        ) : null}
      </Card>
    </Affix>
  );
}
