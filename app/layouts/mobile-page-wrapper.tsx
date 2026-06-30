"use client";

import PageHeader from "@/app/components/page-header";

type MobilePageWrapperProps = {
  title: string;
  children: React.ReactNode;
};

export default function MobilePageWrapper({
  title,
  children,
}: MobilePageWrapperProps) {
  return (
    <main className="mobile-app">
      <PageHeader title={title} />
      {children}
    </main>
  );
}
