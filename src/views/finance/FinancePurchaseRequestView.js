import React from "react";
import BillingRequestView from "../admin/BillingRequestView";

/**
 * Purchase Request detail for the finance role. Reuses the shared billing
 * request view but keeps navigation inside the finance module and exposes the
 * Finance Approval action + supplier bank details (showProductAction={false}),
 * not the HOD per-product approve/reject flow.
 */
const FinancePurchaseRequestView = () => (
  <BillingRequestView
    basePath="/finance/purchase-requests"
    pageTitle="Purchase Requests"
    showProductAction={false}
  />
);

export default FinancePurchaseRequestView;
