import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  X,
  CheckCircle,
  Package,
  Tag as TagIcon,
  Percent,
  Boxes,
  Ruler,
  Building2,
  Truck,
  FileText,
  Hash,
  Image as ImageIcon,
} from "lucide-react";
import productService from "../../services/productService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader, PageHeader } from "../../components";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { formatDateInputValue } from "../../utils/procurementTimeline";
import StatusLabel from "../../components/StatusLabel/StatusLabel";
import { useAuth } from "../../context/AuthContext";
import { isBackOfficeRole } from "../../hooks/usePermissions";

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

// Fallback sample values shown when a field has no real data yet, so the
// redesigned Product Details page always demonstrates its full layout.
const DUMMY_FALLBACK = {
  description:
    "High-quality industrial component engineered for durability, consistent performance, and long service life under demanding conditions.",
  minStock: 10,
  maxStock: 500,
  expiry: "2027-12-31",
  weight: 250,
  weightUnit: "g",
  dimensions: { length: 15, width: 10, height: 5 },
  dimensionUnit: "cm",
  tags: ["Best Seller", "Industrial Grade"],
};

const DUMMY_COMPANY_CODE = {
  industry: { name: "Acme Industries" },
  code: "ACM-PRD-001",
};

const DUMMY_SUPPLIER_CODE = {
  supplier: { name: "Acme Trading Co." },
  code: "SUP-PRD-045",
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

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBackOfficeUser = isBackOfficeRole(user?.role);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedImage, setExpandedImage] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [secretError, setSecretError] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => productService.getById(id));
        const data = res?.data || res;
        setProduct(data);
      } catch (err) {
        toastError(err?.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleHodApproveConfirm = () => {
    setShowConfirmModal(false);
    setSecretCode("");
    setSecretError("");
    setShowSecretModal(true);
  };

  const handleSecretSubmit = async () => {
    if (secretCode !== "2003") {
      setSecretError("Incorrect secret code. Please try again.");
      return;
    }
    setApproving(true);
    try {
      await productService.update(id, { status: "hod_approved" });
      setProduct((prev) => ({ ...prev, status: "hod_approved" }));
      toastSuccess("Product HOD approved successfully.");
      setShowSecretModal(false);
    } catch (err) {
      toastError(err?.message || "Failed to approve product.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "draft":
        return <Badge variant="warning">Draft</Badge>;
      case "hod_approved":
        return <Badge variant="success">HOD Approved</Badge>;
      case "hod_approval_pending":
        return <Badge variant="warning">HOD Approval Pending</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const displayTags = useMemo(() => {
    if (!product) return [];
    return product.tags?.length > 0 ? product.tags : DUMMY_FALLBACK.tags;
  }, [product]);

  const displayCompanyCodes = useMemo(() => {
    if (!product) return [];
    return (product.companyProductCodes || []).length > 0
      ? product.companyProductCodes
      : [DUMMY_COMPANY_CODE];
  }, [product]);

  const displaySupplierCodes = useMemo(() => {
    if (!product) return [];
    return (product.supplierProductCodes || []).length > 0
      ? product.supplierProductCodes
      : [DUMMY_SUPPLIER_CODE];
  }, [product]);

  const displayWeight = product
    ? fieldOr(product.weight || null, "weight")
    : null;
  const displayWeightUnit = product?.weightUnit || DUMMY_FALLBACK.weightUnit;
  const dims = product?.dimensions;
  const hasRealDims =
    dims && (dims.length > 0 || dims.width > 0 || dims.height > 0);
  const displayDims = hasRealDims ? dims : DUMMY_FALLBACK.dimensions;
  const displayDimUnit = product?.dimensionUnit || DUMMY_FALLBACK.dimensionUnit;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading product..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          {error}
          <Button variant="outline" onClick={() => navigate("/products")}>
            Back to Products
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!product) {
    return (
      <Alert variant="warning">
        <AlertDescription className="flex flex-col items-start gap-3">
          Product not found.
          <Button variant="outline" onClick={() => navigate("/products")}>
            Back to Products
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-1">
        <Button
          variant="ghost"
          onClick={() => navigate("/products")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {product.name}
            {getStatusBadge(product.status)}
          </span>
        }
        description={
          product.productCode
            ? `Product Code: ${product.productCode}`
            : undefined
        }
        actions={
          !isBackOfficeUser ? (
            <>
              <Button onClick={() => navigate(`/products/edit/${id}`)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {product?.status !== "hod_approved" && (
                <Button
                  className="bg-success! text-success-foreground hover:opacity-90"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  HOD Approve
                </Button>
              )}
              {product?.status === "hod_approved" && (
                <Badge variant="success" className="px-3 py-1.5 text-sm">
                  HOD Approved
                </Badge>
              )}
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard icon={Package} title="Basic Details">
              <InfoRow
                icon={Hash}
                label="Product Code"
                value={product.productCode}
              />
              <InfoRow label="Category" value={product.category?.name} />
              <InfoRow label="Subcategory" value={product.subcategory?.name} />
              <InfoRow label="Brand" value={product.brand?.name} />
              <InfoRow label="Group" value={product.group?.name} />
              <InfoRow
                label="Default Model Number"
                value={product.defaultModelNumber}
              />
              <InfoRow label="Unit" value={product.unit || "PCS"} />
            </InfoCard>

            <InfoCard icon={Percent} title="Tax & Accounting">
              <InfoRow label="GST Clause" value={product.taxClause} />
              <InfoRow label="HSN Number" value={product.hsnNumber} />
              <InfoRow
                label="GST %"
                value={
                  product.gstPercentage != null && product.gstPercentage !== ""
                    ? `${product.gstPercentage}%`
                    : "-"
                }
              />
            </InfoCard>

            <InfoCard icon={Boxes} title="Inventory">
              <InfoRow
                label="Min Stock"
                value={fieldOr(product.minStock, "minStock")}
              />
              <InfoRow
                label="Max Stock"
                value={fieldOr(product.maxStock, "maxStock")}
              />
              <InfoRow
                label="Expiry"
                value={
                  product.expiry
                    ? formatDateInputValue(product.expiry)
                    : formatDateInputValue(DUMMY_FALLBACK.expiry)
                }
              />
              <InfoRow label="Purchase Unit" value={product.purchaseUnit} />
              <InfoRow label="Sales Unit" value={product.salesUnit} />
            </InfoCard>

            <InfoCard icon={Ruler} title="Physical Attributes">
              <InfoRow
                label="Weight"
                value={
                  displayWeight ? `${displayWeight} ${displayWeightUnit}` : "-"
                }
              />
              <InfoRow
                label="Dimensions"
                value={`${displayDims.length} × ${displayDims.width} × ${displayDims.height} ${displayDimUnit}`}
              />
            </InfoCard>
          </div>

          <InfoCard icon={FileText} title="Description">
            <p className="py-2 text-sm text-foreground">
              {fieldOr(product.description, "description")}
            </p>
          </InfoCard>

          <InfoCard icon={TagIcon} title="Tags">
            <div className="flex flex-wrap gap-2 py-2">
              {displayTags.map((tag, i) => (
                <Badge key={i} variant="info">
                  {tag}
                </Badge>
              ))}
            </div>
          </InfoCard>
        </div>

        {/* Main product images sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product images</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {product.images?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.images.map((img, index) => {
                    const src = getImageUrl(img);
                    return (
                      <div
                        key={img?._id || index}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedImage(src)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setExpandedImage(src)
                        }
                        className="cursor-pointer overflow-hidden rounded border border-border"
                        style={{ width: 120, height: 120 }}
                      >
                        <img
                          src={src}
                          alt=""
                          width={120}
                          height={120}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-border text-muted-foreground"
                  style={{ height: 160 }}
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">No images uploaded</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Variant definitions */}
      {product.hasVariants && product.variants?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variant types</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.variants.map((variant, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  {variant.name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(variant.options || []).map((opt, i) => (
                    <Badge key={i}>{opt}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {product.hasVariants && product.variantCombinations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variant combinations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant Code</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Purchase</TableHead>
                    <TableHead>Selling</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Next Review</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variantCombinations.map((combo, cIdx) => (
                    <TableRow key={combo.uniqueId || cIdx}>
                      <TableCell>
                        <code className="text-xs text-primary!">
                          {combo.variantCode || "—"}
                        </code>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={combo.optionValues
                          ?.map((o) => `${o.variantName}: ${o.variantValue}`)
                          .join(" · ")}
                      >
                        {combo.optionValues
                          ?.map((o) => `${o.variantName}: ${o.variantValue}`)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusLabel
                          status={
                            combo.isActive !== false ? "active" : "inactive"
                          }
                        />
                      </TableCell>
                      <TableCell
                        className="max-w-[180px] truncate"
                        title={
                          combo.modelNumber || product.defaultModelNumber || ""
                        }
                      >
                        {combo.modelNumber || product.defaultModelNumber || "—"}
                      </TableCell>
                      <TableCell>
                        {combo.costPrice != null && combo.costPrice !== ""
                          ? combo.costPrice
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {combo.price != null && combo.price !== ""
                          ? combo.price
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {combo.timeline > 0
                          ? `${combo.timeline} day${combo.timeline === 1 ? "" : "s"}`
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {combo.nextTimelineDate
                          ? formatDateInputValue(combo.nextTimelineDate)
                          : "—"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {combo.procurementReviewStatus &&
                        combo.procurementReviewStatus !== "idle"
                          ? combo.procurementReviewStatus
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(combo.images || []).length > 0 ? (
                            (combo.images || []).map((img, iIdx) => {
                              const src = getImageUrl(img);
                              return (
                                <div
                                  key={img?._id || iIdx}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setExpandedImage(src)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && setExpandedImage(src)
                                  }
                                  className="cursor-pointer overflow-hidden rounded border border-border"
                                  style={{ width: 36, height: 36 }}
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              );
                            })
                          ) : (
                            <div
                              className="flex items-center justify-center rounded border border-dashed border-border bg-muted text-muted-foreground"
                              style={{ width: 36, height: 36 }}
                              title="No image uploaded"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoCard icon={Building2} title="Client Code Mapping">
          {displayCompanyCodes.map((row, idx) => (
            <InfoRow
              key={idx}
              icon={Hash}
              label={row.industry?.name || row.industry?._id || "Client"}
              value={row.code}
            />
          ))}
        </InfoCard>

        <InfoCard icon={Truck} title="Supplier Code Mapping">
          {displaySupplierCodes.map((row, idx) => (
            <InfoRow
              key={idx}
              icon={Hash}
              label={row.supplier?.name || row.supplier?._id || "Supplier"}
              value={row.code}
            />
          ))}
        </InfoCard>
      </div>

      {/* HOD Approve — confirmation modal */}
      <Dialog
        open={showConfirmModal}
        onOpenChange={(o) => !o && setShowConfirmModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm HOD Approval</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2 text-sm text-foreground">
            Are you sure you want to HOD approve{" "}
            <strong>{product?.name}</strong>? This will mark the product as
            approved by HOD.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-success! text-success-foreground hover:opacity-90"
              onClick={handleHodApproveConfirm}
            >
              Yes, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HOD Approve — secret code modal */}
      <Dialog
        open={showSecretModal}
        onOpenChange={(o) => !o && !approving && setShowSecretModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Secret Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 px-6 py-2">
            <Label className="font-semibold">Secret Code</Label>
            <Input
              type="password"
              placeholder="Enter secret code"
              value={secretCode}
              onChange={(e) => {
                setSecretCode(e.target.value);
                setSecretError("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !approving && handleSecretSubmit()
              }
              autoFocus
              aria-invalid={!!secretError}
            />
            {secretError && (
              <p className="text-sm text-destructive">{secretError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={approving}
              onClick={() => setShowSecretModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-success! text-success-foreground hover:opacity-90"
              disabled={approving || !secretCode}
              onClick={handleSecretSubmit}
            >
              {approving ? <Spinner className="h-4 w-4" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image expand modal */}
      <Dialog
        open={!!expandedImage}
        onOpenChange={(o) => !o && setExpandedImage(null)}
      >
        <DialogContent showClose={false} className="max-w-2xl">
          <DialogHeader className="justify-between">
            <DialogTitle>Image</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setExpandedImage(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="p-3 text-center">
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Expanded"
                className="mx-auto rounded"
                style={{ maxHeight: "80vh", objectFit: "contain" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductView;
