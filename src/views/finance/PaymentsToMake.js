import React from "react";
import SupplierPayables from "./SupplierPayables";

/**
 * Payments to Make — the supplier payables ledger framed as an action queue
 * (overdue items first). Same real data as Supplier Dues, `variant="due"`.
 */
const PaymentsToMake = () => <SupplierPayables variant="due" />;

export default PaymentsToMake;
