import {
  EllipsisHorizontalIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { Button } from "konsta/react";

function PageHeader() {
  return (
    <header className="sticky top-safe z-30 bg-(--background)/85 px-safe-4 pt-safe-3 backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between">
        <Button
          clear
          rounded
          className="h-12 w-12 border border-(--border) bg-black/5 p-0 text-(--foreground) dark:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeftIcon className="size-6" />
        </Button>
        <Button
          clear
          rounded
          className="h-12 w-12 border border-(--border) bg-black/5 p-0 text-(--foreground) dark:bg-white/10"
          aria-label="More"
        >
          <EllipsisHorizontalIcon className="size-6" />
        </Button>
      </div>

      <div>
        <h1 className="text-5xl font-bold tracking-[-0.03em] text-(--foreground)">
          Products
        </h1>
        <p className="mt-1 text-3 text-(--muted)">131 Products</p>
      </div>
    </header>
  );
}

export default PageHeader;
