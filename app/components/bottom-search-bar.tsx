import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { Button } from "konsta/react";

export default function BottomSearchBar() {
  return (
    <div className="pointer-events-none fixed bottom-safe-2 left-safe-4 right-safe-4 z-40 flex items-center gap-3">
      <div className="pointer-events-auto flex h-12 flex-1 items-center gap-2 rounded-full border border-(--border) bg-black/5 px-4 text-(--muted) backdrop-blur-md dark:bg-white/10">
        <MagnifyingGlassIcon className="size-5" />
        <span className="text-6 font-medium">Search</span>
      </div>
      <Button
        clear
        rounded
        className="pointer-events-auto h-12 w-12 border border-(--border) bg-black/5 p-0 text-(--foreground) backdrop-blur-md dark:bg-white/10"
        aria-label="Compose"
      >
        <PencilSquareIcon className="size-6" />
      </Button>
    </div>
  );
}
