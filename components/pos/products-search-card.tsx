import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";

type ProductsSearchCardProps = {
  mode: "light" | "dark";
  search: string;
  productsCount: number;
  onSearchChange: (value: string) => void;
};

export function ProductsSearchCard({
  mode,
  search,
  onSearchChange,
}: ProductsSearchCardProps) {
  return (
    <div
      className={`mobile-pos-search-wrap ${
        mode === "dark" ? "mobile-pos-search-wrap--dark" : ""
      }`}
      style={{
        paddingTop: 8,
      }}
    >
      <Input
        className="mobile-pos-search-input"
        placeholder="Games, Apps, Stories and More"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        allowClear
        size="large"
        prefix={<SearchOutlined />}
      />
    </div>
  );
}
