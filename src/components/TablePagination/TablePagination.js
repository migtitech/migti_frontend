import React from "react";
import { CPagination, CPaginationItem } from "@coreui/react";

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

  const pagination = (
    <CPagination
      className={`mb-0 ${className}`.trim()}
      aria-label={ariaLabel}
      align={align}
    >
      <CPaginationItem
        disabled={disabled || isFirstPage}
        onClick={() => goToPage(1)}
      >
        First
      </CPaginationItem>
      <CPaginationItem
        disabled={disabled || isFirstPage}
        onClick={() => goToPage(page - 1)}
      >
        Previous
      </CPaginationItem>
      <CPaginationItem active>
        {page} / {totalPages}
      </CPaginationItem>
      <CPaginationItem
        disabled={disabled || isLastPage}
        onClick={() => goToPage(page + 1)}
      >
        Next
      </CPaginationItem>
      <CPaginationItem
        disabled={disabled || isLastPage}
        onClick={() => goToPage(totalPages)}
      >
        Last
      </CPaginationItem>
    </CPagination>
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
          wrapperClassName ??
          "d-flex justify-content-between align-items-center mt-3"
        }
      >
        <div className="small text-medium-emphasis">
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
