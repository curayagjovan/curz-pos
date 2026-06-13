"use client";

import { useRouter } from "next/navigation";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { SettingOutlined } from "@ant-design/icons";

type SettingsDropdownProps = {
  size?: "small" | "middle" | "large";
};

export function SettingsDropdown({ size = "middle" }: SettingsDropdownProps) {
  const router = useRouter();

  const items: MenuProps["items"] = [
    { key: "general", label: "General" },
    { key: "product", label: "Product" },
  ];

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === "general") {
            router.push("/pages/settings/general");
            return;
          }

          router.push("/pages/settings/product");
        },
      }}
    >
      <Button
        type="text"
        icon={<SettingOutlined />}
        size={size}
        aria-label="Settings menu"
      />
    </Dropdown>
  );
}
