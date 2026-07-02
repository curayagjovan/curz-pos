"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PageType = "products" | "transactions" | "inventory" | "settings";

type PageContextType = {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>("products");
  const [searchQuery, setSearchQuery] = useState<string>("");

  return (
    <PageContext.Provider
      value={{ currentPage, setCurrentPage, searchQuery, setSearchQuery }}
    >
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
