import { Flex, Input, Layout, Typography, theme } from "antd";
import CustomButton from "../custom-antd-components/GlassButton";
import GlassButton from "../custom-antd-components/GlassButton";
import { SettingOutlined } from "@ant-design/icons";

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
          paddingInline: 24,
          paddingTop: "calc(env(safe-area-inset-top))",
          paddingBottom: 10,
          background:
            mode === "dark" ? "rgba(17,24,39,0.92)" : token.colorBgBase,
          backdropFilter: "blur(10px)",
        }}
      >
        <Flex
          align="flex-start"
          justify="flex-start"
          gap={20}
          vertical={showSearch}
        >
          <GlassButton size="large" style={{ alignSelf: "flex-end" }}>
            {/* <SettingOutlined /> */}Edit
          </GlassButton>
          <Typography.Title
            level={1}
            className="font-semibold!"
            style={{
              margin: 0,
              // fontSize: 24,

              width: "100%",
              textAlign: "left",
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Typography.Title>
          {/* {showSearch && (
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
                className="rounded-[14px]"
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
          )} */}
        </Flex>
      </Header>
    </div>
  );
}
