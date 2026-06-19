import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { Link, Searchbar, Toolbar, ToolbarPane } from "konsta/react";
import { useState } from "react";

type BottomSearchBarProps = {
  onSearch?: (query: string) => void;
};

export default function BottomSearchBar({ onSearch }: BottomSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: { target: EventTarget | null }) => {
    const value = (e.target as HTMLInputElement).value;
    setSearchQuery(value);
    onSearch?.(value);
  };
  const handleClear = () => {
    setSearchQuery("");
    onSearch?.("");
  };
  const handleDisable = () => {
    setSearchQuery("");
    onSearch?.("");
  };
  return (
    <Toolbar className={`left-0 sticky bottom-0 w-full mt-auto`}>
      <ToolbarPane>
        <Searchbar
          onInput={handleSearch}
          value={searchQuery}
          onClear={handleClear}
          disableButton
          onDisable={handleDisable}
        />
      </ToolbarPane>
      <ToolbarPane>
        <Link iconOnly>
          <ShoppingCartIcon className="size-6" />
        </Link>
      </ToolbarPane>
    </Toolbar>
  );
}
