import type { ReactNode } from "react";
import { Page } from "konsta/react";

type PageContainerProps = {
  children: ReactNode;
  title: string;
};

export default function PageContainer({ children, title }: PageContainerProps) {
  return (
    <Page className="bg-(--background)">
      <div className="flex min-h-dvh w-full flex-col pt-safe pb-safe px-safe-6">
        <header className="pt-3">
          <div className="flex min-h-11 items-end">
            <h1 className="text-[2.125rem] font-bold tracking-[-0.04em] text-foreground">
              {title}
            </h1>
          </div>
        </header>

        <main className="flex-1 pt-3">{children}</main>
      </div>
    </Page>
  );
}
