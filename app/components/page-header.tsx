import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Link, Navbar } from "konsta/react";

function PageHeader() {
  return (
    <Navbar
      title="Products"
      subtitle="131 Products"
      large
      transparent
      bgClassName="bg-ios-light-surface dark:bg-ios-dark-surface"
      right={
        <Link iconOnly>
          <EllipsisHorizontalIcon className="size-6" />
        </Link>
      }
    />
  );
}

export default PageHeader;
