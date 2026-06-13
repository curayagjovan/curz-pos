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
  title?: string;
};

export function MobilePageHeader({
  mode,
  searchCardProps,
}: MobilePageHeaderProps) {
  const cardBackground = mode === "dark" ? "#111827" : "#f8fafc";
  const cardBorderColor =
    mode === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(15, 23, 42, 0.08)";

  return (
    <Affix offsetTop={0} style={{ zIndex: 50 }}>
      <Card
        className={`mobile-page-header-card mobile-page-header-card--ios ${
          mode === "dark" ? "mobile-page-header-card--ios-dark" : ""
        }`}
        styles={{ body: { padding: "10px 14px" } }}
        style={{
          width: "100%",
          borderRadius: 0,
          borderColor: cardBorderColor,
          paddingInline: 0,
          paddingTop: "calc(8px + env(safe-area-inset-top))",
          background: cardBackground,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow:
            mode === "dark"
              ? "0 10px 26px rgba(2, 6, 23, 0.46)"
              : "0 8px 18px rgba(15, 23, 42, 0.1)",
        }}
      >
        <Flex align="center" justify="space-between">
          <Flex
            align="center"
            justify="space-between"
            className="mobile-page-header-brand"
          >
            <Typography.Title
              className="mobile-page-header-brand-primary"
              level={4}
              style={{
                margin: 0,
                fontWeight: 900,
              }}
            >
              MAMANG
            </Typography.Title>
            <Typography.Title
              className="mobile-page-header-brand-secondary"
              level={4}
              style={{
                margin: 0,
                fontWeight: 300,
              }}
            >
              STORE
            </Typography.Title>
          </Flex>
          <Flex align="center" gap={8}>
            <InstallAppButton size="small" />
            <SettingsDropdown size="middle" />
          </Flex>
        </Flex>
        {searchCardProps ? (
          <div
            className={`mobile-pos-search-affix ${
              mode === "dark" ? "mobile-pos-search-affix--dark" : ""
            }`}
            style={{
              paddingTop: 8,
            }}
          >
            <ProductsSearchCard
              mode={mode}
              search={searchCardProps.search}
              productsCount={searchCardProps.productsCount}
              onSearchChange={searchCardProps.onSearchChange}
            />
          </div>
        ) : null}
      </Card>
    </Affix>
  );
}
