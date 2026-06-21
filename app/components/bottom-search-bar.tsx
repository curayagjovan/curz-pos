import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { Link, Navbar, Searchbar } from "konsta/react";
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
    <Navbar
      className="bottom-safe fixed left-0 mt-auto right-0 top-auto w-full z-40 "
      bgClassName="bg-gradient-to-t from-[#f8f8fb]/96 via-[#f8f8fb]/80 to-[#f8f8fb]/0 dark:from-[#06070b]/97 dark:via-[#0a0b10]/78 dark:to-[#0a0b10]/0 !h-full"
      titleClassName="!w-full pl-8 pr-20"
      title={
        <Searchbar
          onInput={handleSearch}
          value={searchQuery}
          onClear={handleClear}
          disableButton
          onDisable={handleDisable}
        />
      }
      right={
        <Link iconOnly>
          <ShoppingCartIcon className="size-6" />
        </Link>
      }
    />
  );
}
