"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type PageType =
  | "products"
  | "transactions"
  | "inventory"
  | "productMovement"
  | "load"
  | "manageLoad"
  | "ewallet"
  | "manageStaff"
  | "auditLog"
  | "customers";

type PageContextType = {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Owned here (rather than inside MobilePageWrapper) so that virtualized
  // lists rendered as page content can measure/scroll the same element the
  // wrapper uses for pull-to-refresh and scroll-collapse — there's exactly
  // one scrollable ancestor per page and both sides need to agree on it.
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>("products");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <PageContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        searchQuery,
        setSearchQuery,
        scrollContainerRef,
      }}
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
