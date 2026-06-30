"use client";

import {
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Link, List, ListItem, Navbar, Popover, Preloader } from "konsta/react";

type PageHeaderProps = {
  title?: string;
  subtitle?: string | React.ReactNode;
  isLoading?: boolean;
};

function formatPageName(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);

  if (!lastSegment) {
    return "Products";
  }

  return lastSegment
    .split("-")
    .join(" ")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function PageHeader({ title, subtitle, isLoading = false }: PageHeaderProps) {
  const pathname = usePathname();
  const [menuOpened, setMenuOpened] = useState(false);
  const pageName = formatPageName(pathname);
  const resolvedTitle = title ?? pageName;
  const resolvedSubtitle = subtitle ?? pageName;

  return (
    <>
      <Navbar
        title={
          <span className="flex flex-col leading-tight">
            <span>{resolvedTitle}</span>
            <span className="mt-1 flex items-center gap-2 text-[15px] font-medium text-[#2c2c2e] dark:text-[#8e8e93]">
              {isLoading && (
                <Preloader
                  className="text-[#2c2c2e] dark:text-[#8e8e93]"
                  style={{ width: "15px", height: "15px" }}
                />
              )}
              {resolvedSubtitle}
            </span>
          </span>
        }
        large
        bgClassName="bg-gradient-to-b from-[#f8f8fb]/96 via-[#f8f8fb]/80 to-[#f8f8fb]/0 dark:from-[#06070b]/97 dark:via-[#0a0b10]/78 dark:to-[#0a0b10]/0"
        right={
          <Link
            id="page-header-menu-trigger"
            iconOnly
            onClick={(event) => {
              event.preventDefault();
              setMenuOpened(true);
            }}
            aria-label="Open page menu"
          >
            <EllipsisHorizontalIcon className="size-6" />
          </Link>
        }
      />

      <Popover
        opened={menuOpened}
        target="#page-header-menu-trigger"
        onBackdropClick={() => setMenuOpened(false)}
        backdrop
        angle
        className="w-56 rounded-2xl"
      >
        <List strongIos inset className="my-0 min-w-0">
          <ListItem
            link
            title="Transactions"
            media={<ReceiptPercentIcon className="size-5 text-[#0a84ff]" />}
            href="/transactions"
            onClick={() => setMenuOpened(false)}
          />
          <ListItem
            link
            title="Settings"
            media={<Cog6ToothIcon className="size-5 text-[#8e8e93]" />}
            href="/settings"
            onClick={() => setMenuOpened(false)}
          />
        </List>
      </Popover>
    </>
  );
}

export default PageHeader;
