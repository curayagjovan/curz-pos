import type { ReactNode } from "react";
import { Page } from "konsta/react";
import BottomSearchBar from "./bottom-search-bar";
import PageHeader from "./page-header";

type PageContainerProps = {
  children: ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <Page className="bg-(--background)">
      <PageHeader />

      <main className="flex-1 pb-safe px-safe-4 pt-4">{children}</main>
      <BottomSearchBar />
    </Page>
  );
}
