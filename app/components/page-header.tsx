"use client";

import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Link, Navbar } from "konsta/react";

type PageHeaderProps = {
  title?: string;
  subtitle?: string;
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

function PageHeader({ title, subtitle }: PageHeaderProps) {
  const pathname = usePathname();
  const pageName = formatPageName(pathname);
  const resolvedTitle = title ?? pageName;
  const resolvedSubtitle = subtitle ?? pageName;

  return (
    <Navbar
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      large
      // bgClassName="bg-ios-light-surface dark:bg-ios-dark-surface"
      right={
        <Link iconOnly>
          <EllipsisHorizontalIcon className="size-6" />
        </Link>
      }
    />
  );
}

export default PageHeader;
