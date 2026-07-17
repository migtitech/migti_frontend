import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Users,
  Hash,
  Briefcase,
  Landmark,
  Paperclip,
  StickyNote,
  FileBadge,
  Banknote,
  BookOpen,
  Tag,
} from "lucide-react";
import supplierService from "../../services/supplierService";
import bpDummy from "../../data/businessPartnerDummy";
import { Loader } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";
import { openAttachmentPreview } from "../../utils/attachmentPreview";

// Fallback sample values shown when a field has no real/overlay data yet, so
// the redesigned Supplier Details page always demonstrates its full layout.
const DUMMY_FALLBACK = {
  clientType: "Vendor",
  industrySector: "Trading & Distribution",
  registrationNumber: "REG-2024-00987",
  pan: "ABCPS9876K",
  category: "A",
  website: "https://www.suppliersamples.com",
  companyEmail: "sales@suppliersamples.com",
  companyPhone: "+91 98765 12345",
  numberOfEmployees: 80,
  annualRevenue: 12000000,
  registeredAddress: "Warehouse 7, MIDC Industrial Estate",
  billingAddress: "Warehouse 7, MIDC Industrial Estate, Nashik",
  shippingAddress: "Gate 3, Logistics Park, Nashik",
  country: "India",
  state: "Maharashtra",
  city: "Nashik",
  pincode: "422007",
  currency: "INR",
  paymentTerms: "Net 45",
  creditLimit: 250000,
  internalComments: "Reliable vendor, on-time deliveries for 2+ years.",
  label: "Preferred Vendor",
  shop_location: "Shop No. 14, Wholesale Market",
  other_contact: "+91 91234 56789",
  gst: "27ABCPS9876K1ZQ",
};

const DUMMY_BANK_DETAILS = {
  accountHolderName: "Acme Trading Co.",
  accountNumber: "123456789012",
  bankName: "HDFC Bank",
  ifscCode: "HDFC0001234",
  upiDetails: "acmetrading@hdfcbank",
};

const DUMMY_BRANCH = {
  name: "Nashik Warehouse",
  address: "Plot 9, MIDC Ambad",
  city: "Nashik",
  state: "Maharashtra",
  pincode: "422010",
};

const DUMMY_ATTACHMENTS = [
  { id: "dummy_att_1", fileName: "supplier_agreement.pdf" },
  { id: "dummy_att_2", fileName: "gst_certificate.pdf" },
];

const DUMMY_CATEGORIES = ["Electronics", "Hardware", "Packaging"];

const formatINRCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const overlayOr = (overlay, key) => {
  const value = overlay?.[key];
  if (value === "" || value === null || value === undefined) {
    return DUMMY_FALLBACK[key];
  }
  return value;
};

const fieldOr = (value, key) => {
  if (value === "" || value === null || value === undefined) {
    return DUMMY_FALLBACK[key];
  }
  return value;
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
    <div className="min-w-0 flex-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium text-foreground">
        {value || value === 0 ? String(value) : "-"}
      </div>
    </div>
  </div>
);

const InfoCard = ({ icon, title, children }) => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-2 pb-2">
      {icon &&
        React.createElement(icon, { className: "h-4 w-4 text-primary!" })}
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent className="divide-y divide-border pt-0">
      {children}
    </CardContent>
  </Card>
);

const SupplierView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSupplier = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => supplierService.getById(id));
        const data = res?.data || res;
        setSupplier(data);
      } catch (err) {
        toastError(err?.message || "Failed to fetch supplier");
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id]);

  const overlay = useMemo(
    () => (id ? bpDummy.getOverlay("supplier", id) : bpDummy.defaultOverlay()),
    [id, supplier],
  );

  const supplierCode = useMemo(
    () => (id ? bpDummy.getOrCreateCode("supplier", id) : ""),
    [id, supplier],
  );

  const displayCategories = useMemo(() => {
    const cats = supplier?.categories || [];
    if (cats.length > 0) {
      return cats.map((cat) => (typeof cat === "string" ? cat : cat?.name));
    }
    return DUMMY_CATEGORIES;
  }, [supplier]);

  const displayBankDetails = useMemo(() => {
    const bd = supplier?.bankDetails || {};
    const hasReal = [
      bd.accountHolderName,
      bd.accountNumber,
      bd.bankName,
      bd.ifscCode,
      bd.upiDetails,
    ].some((v) => String(v || "").trim());
    return hasReal ? bd : DUMMY_BANK_DETAILS;
  }, [supplier]);

  const displayBranches =
    (overlay?.branches || []).length > 0 ? overlay.branches : [DUMMY_BRANCH];

  const displayAttachments =
    (overlay?.attachments || []).length > 0
      ? overlay.attachments
      : DUMMY_ATTACHMENTS;

  const displayCatalog = supplier?.catalog?.url
    ? supplier.catalog
    : { url: "#", fileName: "sample_catalog.pdf", uploadedAt: null };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading supplier..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-2">
          {error}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => navigate("/suppliers")}
          >
            Back to Suppliers
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!supplier) {
    return (
      <Alert variant="warning">
        <AlertDescription className="flex flex-wrap items-center gap-2">
          Supplier not found.
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => navigate("/suppliers")}
          >
            Back to Suppliers
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/suppliers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Button>
        <Button type="button" onClick={() => navigate(`/suppliers/edit/${id}`)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Header summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {overlay?.companyLogoBase64 && (
                  <AvatarImage
                    src={overlay.companyLogoBase64}
                    alt={supplier.name}
                  />
                )}
                <AvatarFallback className="text-lg">
                  {(supplier.name || "SU").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold leading-tight">
                  {supplier.name || "-"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {supplierCode || "Supplier code pending"}
                  {supplier.shopname ? ` · ${supplier.shopname}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{overlayOr(overlay, "clientType")}</Badge>
              <Badge variant="secondary">
                {overlayOr(overlay, "industrySector")}
              </Badge>
              <Badge variant="outline">
                Category {overlayOr(overlay, "category")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info card grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard icon={Building2} title="Basic Details">
          <InfoRow
            icon={Hash}
            label="Supplier Code"
            value={supplierCode || "Pending"}
          />
          <InfoRow
            icon={Briefcase}
            label="Registration Number"
            value={overlayOr(overlay, "registrationNumber")}
          />
          <InfoRow
            icon={FileBadge}
            label="PAN"
            value={overlayOr(overlay, "pan")}
          />
          <InfoRow
            icon={FileBadge}
            label="GST Number"
            value={fieldOr(supplier.gst, "gst")}
          />
          <InfoRow
            icon={Tag}
            label="Label"
            value={fieldOr(supplier.label, "label")}
          />
          <InfoRow
            icon={MapPin}
            label="Shop Location"
            value={fieldOr(supplier.shop_location, "shop_location")}
          />
        </InfoCard>

        <InfoCard icon={Mail} title="Contact Information">
          <InfoRow icon={Mail} label="Email" value={supplier.email} />
          <InfoRow icon={Phone} label="Phone 1" value={supplier.phone_1} />
          <InfoRow icon={Phone} label="Phone 2" value={supplier.phone_2} />
          <InfoRow
            icon={Phone}
            label="Other Contact"
            value={fieldOr(supplier.other_contact, "other_contact")}
          />
          <InfoRow
            icon={Globe}
            label="Website"
            value={overlayOr(overlay, "website")}
          />
          <InfoRow
            icon={Mail}
            label="Company Email"
            value={overlayOr(overlay, "companyEmail")}
          />
          <InfoRow
            icon={Phone}
            label="Company Phone"
            value={overlayOr(overlay, "companyPhone")}
          />
        </InfoCard>

        <InfoCard icon={Users} title="Company Scale">
          <InfoRow
            icon={Users}
            label="Number of Employees"
            value={overlayOr(overlay, "numberOfEmployees")}
          />
          <InfoRow
            icon={Landmark}
            label="Annual Revenue"
            value={formatINRCurrency(overlayOr(overlay, "annualRevenue"))}
          />
        </InfoCard>

        <InfoCard icon={MapPin} title="Address Information">
          <InfoRow label="Address" value={supplier.address} />
          <InfoRow
            label="Registered Address"
            value={overlayOr(overlay, "registeredAddress")}
          />
          <InfoRow
            label="Billing Address"
            value={overlayOr(overlay, "billingAddress")}
          />
          <InfoRow
            label="Shipping Address"
            value={overlayOr(overlay, "shippingAddress")}
          />
          <InfoRow
            label="City / State"
            value={`${overlayOr(overlay, "city")}, ${overlayOr(overlay, "state")}`}
          />
          <InfoRow
            label="Country / Pincode"
            value={`${overlayOr(overlay, "country")} - ${overlayOr(overlay, "pincode")}`}
          />
        </InfoCard>

        <InfoCard icon={CreditCard} title="Financial Information">
          <InfoRow
            icon={CreditCard}
            label="Currency"
            value={overlayOr(overlay, "currency")}
          />
          <InfoRow
            icon={Briefcase}
            label="Payment Terms"
            value={overlayOr(overlay, "paymentTerms")}
          />
          <InfoRow
            icon={Landmark}
            label="Credit Limit"
            value={formatINRCurrency(overlayOr(overlay, "creditLimit"))}
          />
        </InfoCard>

        <InfoCard icon={Banknote} title="Bank Details">
          <InfoRow
            icon={Users}
            label="Account Holder"
            value={displayBankDetails.accountHolderName}
          />
          <InfoRow
            icon={Hash}
            label="Account Number"
            value={displayBankDetails.accountNumber}
          />
          <InfoRow
            icon={Landmark}
            label="Bank Name"
            value={displayBankDetails.bankName}
          />
          <InfoRow
            icon={FileBadge}
            label="IFSC Code"
            value={displayBankDetails.ifscCode}
          />
          <InfoRow
            icon={CreditCard}
            label="UPI Details"
            value={displayBankDetails.upiDetails}
          />
        </InfoCard>

        <InfoCard icon={Tag} title="Categories">
          <div className="flex flex-wrap gap-2 py-2">
            {displayCategories.map((cat, idx) => (
              <Badge variant="info" key={idx}>
                {cat}
              </Badge>
            ))}
          </div>
        </InfoCard>

        <InfoCard icon={BookOpen} title="Catalog">
          <div className="py-2">
            <div className="mb-1 break-all text-sm font-medium text-foreground">
              {displayCatalog.fileName}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={displayCatalog.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" type="button">
                  View
                </Button>
              </a>
              <a
                href={displayCatalog.url}
                download={displayCatalog.fileName || true}
              >
                <Button size="sm" variant="outline" type="button">
                  Download
                </Button>
              </a>
            </div>
            {displayCatalog.uploadedAt && (
              <small className="mt-2 block text-muted-foreground">
                Uploaded: {dateTimeFormatter(displayCatalog.uploadedAt, "-")}
              </small>
            )}
          </div>
        </InfoCard>

        <InfoCard icon={StickyNote} title="Additional Information">
          <InfoRow label="Remark" value={supplier.remark} />
          <InfoRow
            label="Internal Comments"
            value={overlayOr(overlay, "internalComments")}
          />
        </InfoCard>

        <InfoCard icon={Paperclip} title="Attachments">
          {displayAttachments.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() => openAttachmentPreview(att)}
              className="flex w-full items-start gap-3 py-2 text-left transition-colors hover:opacity-80"
            >
              <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">File</div>
                <div className="truncate text-sm font-medium text-primary! underline-offset-2 hover:underline">
                  {att.fileName || "-"}
                </div>
              </div>
            </button>
          ))}
        </InfoCard>
      </div>

      {/* Branches */}
      <div>
        <h6 className="mb-2 flex items-center gap-2 font-semibold">
          <Building2 className="h-4 w-4 text-primary!" />
          Branches
        </h6>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayBranches.map((branch, idx) => (
            <Card key={branch._id || idx}>
              <CardContent className="p-4">
                <div className="text-sm font-semibold">
                  {branch.name || "-"}
                </div>
                <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {branch.address || "-"}
                    {branch.city ? `, ${branch.city}` : ""}
                    {branch.state ? `, ${branch.state}` : ""}
                    {branch.pincode ? ` - ${branch.pincode}` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupplierView;
