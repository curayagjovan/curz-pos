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
    <Input
      className="mobile-pos-search-input"
      placeholder="Games, Apps, Stories and More"
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      allowClear
      size="small"
      prefix={<SearchOutlined />}
    />
  );
}
