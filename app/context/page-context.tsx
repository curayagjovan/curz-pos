"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PageType = "products" | "transactions" | "inventory" | "settings";

type PageContextType = {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>("products");

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used within PageProvider");
  }
  return context;
}
