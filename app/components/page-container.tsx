import type { ReactNode } from "react";
import { Page } from "konsta/react";

type PageContainerProps = {
  children: ReactNode;
  title: string;
};

export default function PageContainer({ children, title }: PageContainerProps) {
  return (
    <Page className="bg-(--background)">
      <div
        className="flex min-h-dvh w-full flex-col"
        style={{
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "calc(var(--safe-left) + 1.5rem)",
          paddingRight: "calc(var(--safe-right) + 1.5rem)",
        }}
      >
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
