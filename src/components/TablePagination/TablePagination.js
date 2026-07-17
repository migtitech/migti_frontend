import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../lib/utils";

export const getPaginationRange = (
  currentPage = 1,
  itemsPerPage = 10,
  totalItems = 0,
) => {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return { start, end, total: totalItems };
};

const TablePagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  totalItems,
  itemsPerPage = 10,
  showRange = false,
  className = "",
  wrapperClassName,
  ariaLabel = "Table pages",
  align,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  const goToPage = (nextPage) => {
    if (
      disabled ||
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }
    onPageChange?.(nextPage);
  };

  const navBtn = "h-8 w-8";
  const pagination = (
    <nav
      className={cn(
        "flex items-center gap-1",
        align === "center" && "justify-center",
        align === "end" && "justify-end",
        className,
      )}
      aria-label={ariaLabel}
    >
      <Button
        variant="outline"
        size="icon"
        className={navBtn}
        disabled={disabled || isFirstPage}
        onClick={() => goToPage(1)}
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={navBtn}
        disabled={disabled || isFirstPage}
        onClick={() => goToPage(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="px-3 text-sm font-medium text-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        className={navBtn}
        disabled={disabled || isLastPage}
        onClick={() => goToPage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={navBtn}
        disabled={disabled || isLastPage}
        onClick={() => goToPage(totalPages)}
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  );

  if (showRange && totalItems != null) {
    const { start, end, total } = getPaginationRange(
      page,
      itemsPerPage,
      totalItems,
    );
    return (
      <div
        className={
          wrapperClassName ?? "mt-4 flex items-center justify-between gap-3"
        }
      >
        <div className="text-sm text-muted-foreground">
          Showing {start}-{end} of {total}
        </div>
        {pagination}
      </div>
    );
  }

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{pagination}</div>;
  }

  return pagination;
};

export default TablePagination;
