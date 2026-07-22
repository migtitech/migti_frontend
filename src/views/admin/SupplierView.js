import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
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
import supplierBranchService from "../../services/supplierBranchService";
import supplierContactPersonService from "../../services/supplierContactPersonService";
import bpDummy from "../../data/businessPartnerDummy";
import { Loader, StatusBadge, BackButton } from "../../components";
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

const formatINRCurrency = (value) => {
  if (value === "" || value === null || value === undefined) return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const InfoRow = ({ label, value }) => {
  const hasValue = value || value === 0;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          hasValue
            ? "min-w-0 break-words text-right text-sm font-medium text-foreground"
            : "text-right text-sm font-medium text-muted-foreground/60"
        }
      >
        {hasValue ? String(value) : "NA"}
      </div>
    </div>
  );
};

const InfoCard = ({ icon: Icon, title, children }) => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary!" />
        </span>
      )}
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent className="divide-y divide-border">{children}</CardContent>
  </Card>
);

const SupplierView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const fetchSupplier = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => supplierService.getById(id));
        const data = res?.data || res;
        setSupplier(data);
      } catch (err) {
        toastError(err?.message || "Failed to load supplier");
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadBranches = async () => {
      try {
        const res = await supplierBranchService.getAll({
          supplierId: id,
          pageSize: 100,
        });
        const data = res?.data || res;
        if (!cancelled) setBranches(data?.branches || []);
      } catch {
        if (!cancelled) setBranches([]);
      }
    };
    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // F-SUPPLIER: surface ACTIVE contacts only (inactive hidden), like the customer.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadContacts = async () => {
      try {
        const res = await supplierContactPersonService.getAll({
          supplierId: id,
          status: "active",
          pageSize: 100,
        });
        const data = res?.data || res;
        if (!cancelled) setContacts(data?.contactPersons || []);
      } catch {
        if (!cancelled) setContacts([]);
      }
    };
    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const overlay = useMemo(
    () => (id ? bpDummy.getOverlay("supplier", id) : bpDummy.defaultOverlay()),
    [id, supplier],
  );

  const supplierCode = useMemo(
    () =>
      supplier?.supplierCode ||
      (id ? bpDummy.getOrCreateCode("supplier", id) : ""),
    [id, supplier],
  );

  // Map categoryId → grade (L1/L2/L3) for display on the Categories card (D13).
  const gradeByCategoryId = useMemo(() => {
    const map = {};
    (supplier?.categoryGrades || []).forEach((cg) => {
      const cid =
        typeof cg?.category === "string" ? cg.category : cg?.category?._id;
      if (cid) map[cid] = cg?.grade || null;
    });
    return map;
  }, [supplier]);

  const displayCategories = useMemo(() => {
    const cats = supplier?.categories || [];
    return cats.map((cat) => {
      if (typeof cat === "string") return { name: cat, grade: null };
      return { name: cat?.name, grade: gradeByCategoryId[cat?._id] || null };
    });
  }, [supplier, gradeByCategoryId]);

  const displayBankDetails = supplier?.bankDetails || {};

  const displayAttachments = overlay?.attachments || [];

  const displayCatalog = supplier?.catalog?.url ? supplier.catalog : null;

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
        <BackButton fallback="/suppliers" />
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
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold leading-tight">
                    {supplier.name || "-"}
                  </h3>
                  <StatusBadge
                    status={supplier.isActive !== false ? "Active" : "Inactive"}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {supplierCode || "Supplier code pending"}
                  {supplier.shopname ? ` · ${supplier.shopname}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {supplier.clientType && (
                <Badge variant="info">{supplier.clientType}</Badge>
              )}
              {supplier.industrySector && (
                <Badge variant="secondary">{supplier.industrySector}</Badge>
              )}
              {supplier.category && (
                <Badge variant="outline">Category {supplier.category}</Badge>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-border border-t sm:grid-cols-4">
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Categories</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {displayCategories.length}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Branches</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {branches.length}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Attachments</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {displayAttachments.length}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {supplier.isActive !== false ? "Active" : "Inactive"}
              </div>
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
            value={supplier.registrationNumber}
          />
          <InfoRow icon={FileBadge} label="PAN" value={supplier.pan} />
          <InfoRow icon={FileBadge} label="GST Number" value={supplier.gst} />
          <InfoRow icon={Tag} label="Label" value={supplier.label} />
          <InfoRow
            icon={MapPin}
            label="Shop Location"
            value={supplier.shop_location}
          />
        </InfoCard>

        <InfoCard icon={Mail} title="Contact Information">
          <InfoRow icon={Mail} label="Email" value={supplier.email} />
          <InfoRow icon={Phone} label="Phone 1" value={supplier.phone_1} />
          <InfoRow icon={Phone} label="Phone 2" value={supplier.phone_2} />
          <InfoRow
            icon={Phone}
            label="Other Contact"
            value={supplier.other_contact}
          />
          <InfoRow icon={Globe} label="Website" value={supplier.website} />
          <InfoRow
            icon={Mail}
            label="Company Email"
            value={supplier.companyEmail}
          />
          <InfoRow
            icon={Phone}
            label="Company Phone"
            value={supplier.companyPhone}
          />
        </InfoCard>

        <InfoCard icon={Users} title="Company Scale">
          <InfoRow
            icon={Users}
            label="Number of Employees"
            value={supplier.numberOfEmployees}
          />
          <InfoRow
            icon={Landmark}
            label="Annual Revenue"
            value={formatINRCurrency(supplier.annualRevenue)}
          />
        </InfoCard>

        <InfoCard icon={MapPin} title="Address Information">
          <InfoRow label="Address" value={supplier.address} />
          <InfoRow
            label="Registered Address"
            value={supplier.registeredAddress}
          />
          <InfoRow label="Billing Address" value={supplier.billingAddress} />
          <InfoRow label="Shipping Address" value={supplier.shippingAddress} />
          <InfoRow
            label="City / State"
            value={
              supplier.city || supplier.state
                ? `${supplier.city || "-"}, ${supplier.state || "-"}`
                : ""
            }
          />
          <InfoRow label="Pincode" value={supplier.pincode} />
        </InfoCard>

        <InfoCard icon={CreditCard} title="Financial Information">
          <InfoRow
            icon={Briefcase}
            label="Payment Terms"
            value={supplier.paymentTerms}
          />
          <InfoRow
            icon={Landmark}
            label="Credit Limit"
            value={formatINRCurrency(supplier.creditLimit)}
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
          {displayCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-2">
              {displayCategories.map((cat, idx) => (
                <Badge variant="info" key={idx}>
                  {cat.name}
                  {cat.grade ? ` · ${cat.grade}` : ""}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No categories assigned.
            </p>
          )}
        </InfoCard>

        <InfoCard icon={Users} title="Contacts">
          {contacts.length > 0 ? (
            <div className="divide-y divide-border">
              {contacts.map((c) => {
                const fullName = [c.firstName, c.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={c._id} className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {fullName || "-"}
                      </span>
                      {c.isPrimary && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                    </div>
                    {c.designation && (
                      <div className="text-xs text-muted-foreground">
                        {c.designation}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      {c.mobileNumber && <span>📞 {c.mobileNumber}</span>}
                      {c.email && <span>✉ {c.email}</span>}
                    </div>
                    {c.remarks && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No active contacts.
            </p>
          )}
        </InfoCard>

        <InfoCard icon={BookOpen} title="Catalog">
          {displayCatalog ? (
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
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No catalog uploaded.
            </p>
          )}
        </InfoCard>

        <InfoCard icon={StickyNote} title="Additional Information">
          <InfoRow label="Remark" value={supplier.remark} />
          <InfoRow
            label="Internal Comments"
            value={supplier.internalComments}
          />
        </InfoCard>

        <InfoCard icon={Paperclip} title="Attachments">
          {displayAttachments.length > 0 ? (
            displayAttachments.map((att) => (
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
            ))
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No attachments uploaded.
            </p>
          )}
        </InfoCard>
      </div>

      {/* Branches */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary!" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Branches</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Locations registered under this supplier.
            </p>
          </div>
        </div>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No branches added for this supplier.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch, idx) => (
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
        )}
      </div>
    </div>
  );
};

export default SupplierView;
