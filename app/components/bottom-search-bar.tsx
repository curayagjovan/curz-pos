import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { Link, Navbar, Searchbar } from "konsta/react";
import { useState } from "react";

type BottomSearchBarProps = {
  onSearch?: (query: string) => void;
  cartCount?: number;
  onCartClick?: () => void;
};

export default function BottomSearchBar({
  onSearch,
  cartCount = 0,
  onCartClick,
}: BottomSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

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
      className="bottom-search-navbar bottom-0 fixed left-0 mt-auto right-0 top-auto w-full z-40 pt-0! pb-[env(safe-area-inset-bottom)]"
      bgClassName="bg-gradient-to-t from-[#f8f8fb]/96 via-[#f8f8fb]/80 to-[#f8f8fb]/0 dark:from-[#06070b]/97 dark:via-[#0a0b10]/78 dark:to-[#0a0b10]/0 !h-full"
      titleClassName={`!w-full pl-8 ${isSearchActive ? "pr-8" : "pr-20"}`}
      title={
        <Searchbar
          onInput={handleSearch}
          value={searchQuery}
          onClear={handleClear}
          onFocus={() => setIsSearchActive(true)}
          onBlur={() => setIsSearchActive(false)}
          disableButton
          onDisable={() => {
            setIsSearchActive(false);
            handleDisable();
          }}
        />
      }
      right={
        !isSearchActive && (
          <Link iconOnly className="relative" onClick={onCartClick}>
            <ShoppingCartIcon className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        )
      }
    />
  );
}
