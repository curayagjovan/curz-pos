import { Affix, Flex, Layout, Typography, theme } from "antd";
import { SettingsDropdown } from "@/app/components/settings/settings-dropdown";

const { Header } = Layout;

type MobilePageHeaderProps = {
  mode: "light" | "dark";
  title?: string;
};

export function MobilePageHeader({
  mode,
  title = "SHOPMAE",
}: MobilePageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <Affix offsetTop={0} style={{ zIndex: 50 }}>
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
        <Flex align="center" justify="space-between">
          <Typography.Title
            level={4}
            style={{
              margin: 0,
              fontSize: 24,
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Typography.Title>
          <SettingsDropdown size="middle" />
        </Flex>
      </Header>
    </Affix>
  );
}
