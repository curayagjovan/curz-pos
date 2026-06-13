import { ConfigProvider, theme as antdTheme } from "antd";

type AntdConfigProviderProps = {
  children: React.ReactNode;
};

export function AntdConfigProvider({ children }: AntdConfigProviderProps) {
  const token = {
    colorPrimary: "#0b6bcb",
    borderRadius: 12,
    fontFamily: "var(--font-inter), sans-serif",
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 16,
    lineHeight: 1.5,
    lineHeightSM: 1.4,
    lineHeightLG: 1.55,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
