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

      <main className="px-safe-4 pt-4 pb-safe-24">{children}</main>
      <BottomSearchBar />
    </Page>
  );
}
