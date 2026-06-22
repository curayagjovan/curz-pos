"use client";

import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Link, Navbar, Preloader } from "konsta/react";

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
  const pageName = formatPageName(pathname);
  const resolvedTitle = title ?? pageName;
  const resolvedSubtitle = subtitle ?? pageName;

  return (
    <Navbar
      title={
        <span className="flex flex-col leading-tight">
          <span>{resolvedTitle}</span>
          <span className="mt-1 flex items-center gap-2 text-[15px] font-medium text-[#2c2c2e] dark:text-[#8e8e93]">
            {isLoading && (
              <Preloader
                className="scale-50 text-[#2c2c2e] dark:text-[#8e8e93]"
                style={{ width: "16px", height: "16px" }}
              />
            )}
            {resolvedSubtitle}
          </span>
        </span>
      }
      large
      bgClassName="bg-gradient-to-b from-[#f8f8fb]/96 via-[#f8f8fb]/80 to-[#f8f8fb]/0 dark:from-[#06070b]/97 dark:via-[#0a0b10]/78 dark:to-[#0a0b10]/0"
      right={
        <Link iconOnly>
          <EllipsisHorizontalIcon className="size-6" />
        </Link>
      }
    />
  );
}

export default PageHeader;
