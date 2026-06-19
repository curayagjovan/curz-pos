import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Link, Navbar } from "konsta/react";

function PageHeader() {
  return (
    <Navbar
      title="Products"
      subtitle="131 Products"
      large
      transparent
      bgClassName="backdrop-blur-xl"
      colors={{
        bgIos: "bg-white/78 dark:bg-black/70",
        textIos: "text-black dark:text-white",
      }}
      right={
        <Link
          iconOnly
          colors={{
            navbarTextIos: "text-black dark:text-white",
          }}
        >
          <EllipsisHorizontalIcon className="size-6" />
        </Link>
      }
    />
  );
}

export default PageHeader;
