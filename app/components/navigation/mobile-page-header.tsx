import { Flex, Input, Layout, Typography, theme } from "antd";

const { Header } = Layout;

type MobilePageHeaderProps = {
  mode: "light" | "dark";
  title?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function MobilePageHeader({
  mode,
  title = "",
  showSearch = false,
  searchValue = "",
  onSearchChange,
}: MobilePageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
      }}
    >
      <Header
        style={{
          height: "auto",
          lineHeight: "normal",
          paddingInline: 14,
          paddingTop: "calc(8px + env(safe-area-inset-top))",
          paddingBottom: 10,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background:
            mode === "dark" ? "rgba(17,24,39,0.92)" : token.colorBgElevated,
          backdropFilter: "blur(10px)",
        }}
      >
        <Flex
          align="flex-start"
          justify="flex-start"
          gap={12}
          vertical={showSearch}
        >
          <Typography.Title
            level={4}
            style={{
              margin: 0,
              fontSize: 24,
              width: "100%",
              textAlign: "left",
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Typography.Title>
          {showSearch && (
            <div
              style={{
                width: "100%",
                opacity: showSearch ? 1 : 0,
                height: showSearch ? "auto" : 0,
                overflow: "hidden",
                transition: "opacity 200ms ease, height 200ms ease",
              }}
            >
              <Input.Search
                placeholder="Search by name or SKU…"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                allowClear
                size="large"
                style={{
                  width: "100%",
                }}
              />
            </div>
          )}
        </Flex>
      </Header>
    </div>
  );
}
