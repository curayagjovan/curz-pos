import type { ReactNode } from "react";
import { Link, Navbar, Page } from "konsta/react";

type PageContainerProps = {
  children: ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <Page className="bg-(--background)">
      <Navbar
        title="Navbar"
        subtitle="Subtitle"
        className="top-0 sticky"
        large
        transparent
        right={<Link>Right</Link>}
      />

      <main className="flex-1 pt-3">{children}</main>
    </Page>
  );
}
