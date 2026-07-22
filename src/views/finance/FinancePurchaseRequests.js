import React from "react";
import BillingRequestList from "../admin/BillingRequestList";

/**
 * Purchase Requests for the finance role. Reuses the proven billing/purchase
 * request list (real data) but keeps navigation inside the finance module so
 * the finance route gate (ProtectedRoute.isFinanceAllowedPath) stays satisfied.
 * Detail opens at /finance/purchase-requests/:id.
 */
const FinancePurchaseRequests = () => (
  <BillingRequestList
    basePath="/finance/purchase-requests"
    pageTitle="Purchase Requests"
  />
);

export default FinancePurchaseRequests;
