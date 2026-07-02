"use client";

import PageHeader from "@/app/components/page-header";
import Footer from "@/app/components/footer";

type MobilePageWrapperProps = {
  title: string;
  children: React.ReactNode;
};

export default function MobilePageWrapper({
  title,
  children,
}: MobilePageWrapperProps) {
  return (
    <div className="app-shell">
      <div className="app-top">
        <PageHeader title={title} />
      </div>
      <div className="app-body">{children}</div>
      <div className="app-bottom">
        <Footer />
      </div>
    </div>
  );
}
