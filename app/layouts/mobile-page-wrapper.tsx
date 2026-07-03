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
    <div>
      <div>
        <PageHeader title={title} />
      </div>
      <main>{children}</main>
      <div>
        <Footer />
      </div>
    </div>
  );
}
