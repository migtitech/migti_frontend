import React from "react";
import PurchaseReturnDashboard from "../purchaseMaster/PurchaseReturnDashboard";

/**
 * Purchase Return Requests for the finance role. Reuses the existing purchase
 * return dashboard (self-contained, no sub-routes) so finance can review return
 * requests and their financial impact from within the finance module.
 */
const FinancePurchaseReturns = () => <PurchaseReturnDashboard />;

export default FinancePurchaseReturns;
