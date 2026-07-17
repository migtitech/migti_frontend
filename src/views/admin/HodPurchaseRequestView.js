import BillingRequestView from "./BillingRequestView";

const HodPurchaseRequestView = () => (
  <BillingRequestView
    basePath="/purchase-requests"
    pageTitle="Purchase Requests"
    showProductAction={true}
  />
);

export default HodPurchaseRequestView;
