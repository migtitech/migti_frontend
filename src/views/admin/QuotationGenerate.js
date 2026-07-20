import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  MessageSquare,
  Package,
  MapPin,
  Users,
  ImageOff,
  CheckCircle2,
} from "lucide-react";
import queryService from "../../services/queryService";
import { getAssetsUrl } from "../../api/endpoints";
import PageHeader from "../../components/PageHeader/PageHeader";
import { BackButton, Loader } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Label,
  Textarea,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";
import {
  QUERY_PRODUCT_QUOTATION_STATUS,
  filterProductsReadyForQuotation,
} from "../../utils/queryProductQuotationStatus";

const formatVariants = (variants) => {
  if (!variants?.length) return "—";
  return (
    variants
      .map((v) => v.variantName || v || "—")
      .filter(Boolean)
      .join(", ") || "—"
  );
};

const QuotationGenerate = () => {
  const { queryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryFromState = location.state?.query || null;
  const forceNewQuotation = !!location.state?.forceNewQuotation;
  const { canCreate, canUpdate } = usePermissions();
  const canSubmitQuotation = canCreate("quotations") || canUpdate("quotations");

  const [query, setQuery] = useState(queryFromState);
  const [loading, setLoading] = useState(!queryFromState);
  const [remark, setRemark] = useState("");
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImages, setExpandedImages] = useState([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);

  const getImageUrl = (img) => {
    if (!img) return "";
    if (typeof img === "string")
      return img.startsWith("http") ? img : getAssetsUrl(img);
    if (typeof img === "object" && img?.path)
      return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
    if (typeof img === "object" && img?.url) return img.url;
    return "";
  };

  const mapReadyProducts = (sourceProducts = []) =>
    filterProductsReadyForQuotation(sourceProducts).map((product) => ({
      ...product,
    }));

  useEffect(() => {
    const load = async () => {
      if (!queryId) return;
      if (queryFromState) {
        const readyProducts = mapReadyProducts(queryFromState.products || []);
        if (readyProducts.length === 0) {
          toastError("No products marked ready for quotation.");
          navigate(`/queries/${queryId}`);
          return;
        }
        setProducts(readyProducts);
        setRemark(queryFromState.remark || "");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => queryService.getById(queryId));
        const data = res?.data || res;
        const q = data?.data ?? data;
        const readyProducts = mapReadyProducts(q?.products || []);
        if (readyProducts.length === 0) {
          toastError("No products marked ready for quotation.");
          navigate(`/queries/${queryId}`);
          return;
        }
        setQuery(q);
        setProducts(readyProducts);
        setRemark(q?.remark || "");
      } catch (err) {
        toastError(err?.message || "Failed to load query");
        navigate("/queries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryId, queryFromState, navigate]);

  const handleSubmit = async () => {
    if (!query?.queryCode) {
      toastError("Query code is missing");
      return;
    }
    if (products.length === 0) {
      toastError("Add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      const productsPayload = products.map((p) => {
        const pid = p.product_id;
        const productId = !pid
          ? null
          : typeof pid === "object" && pid._id
            ? String(pid._id)
            : String(pid);
        return {
          productName: p.productName || "",
          quantity: Number(p.quantity) ?? 1,
          unit: p.unit || "",
          hsnNumber: p.hsnNumber || "",
          modelNumber: p.modelNumber || "",
          rawProductCode:
            (p.rawProductCode && String(p.rawProductCode).trim()) || "",
          gstPercentage:
            typeof p.gstPercentage === "number" ? p.gstPercentage : null,
          variants: (p.variants || []).map((v) => ({
            variantName: v.variantName || v || "",
          })),
          remark: p.remark || "",
          description: p.description || "",
          product_id: productId,
          images: (p.images || [])
            .map((img) => (typeof img === "object" && img?._id ? img._id : img))
            .filter(Boolean),
          quotation_status: QUERY_PRODUCT_QUOTATION_STATUS.READY_FOR_QUOTATION,
        };
      });
      const res = await queryService.convertToQuotation(query.queryCode, {
        remark,
        products: productsPayload,
        forceNewQuotation,
      });
      const bundle = res?.data ?? res;
      const quotation = bundle?.quotation;
      const updatedQuery = bundle?.query;
      const qMongoId = updatedQuery?._id ?? updatedQuery?.id ?? queryId;
      const quotationId = quotation?._id ?? quotation?.id;
      const quotationCode = quotation?.quotationCode ?? "";
      if (qMongoId && quotationId) {
        try {
          await queryService.syncQuotationOnQuery({
            queryId: String(qMongoId),
            quotationId: String(quotationId),
            quotationCode,
          });
        } catch (syncErr) {
          console.error("syncQuotationOnQuery failed", syncErr);
        }
      }
      toastSuccess("Quotation created successfully");
      if (quotation?._id || quotation?.id) {
        navigate(`/quotations/${quotation._id || quotation.id}`);
      } else {
        navigate("/quotations");
      }
    } catch (err) {
      toastError(err?.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const ci = query?.companyInfo || {};
  const prods = products;

  if (loading) return <Loader />;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary!" />
            Generate Quotation
          </span>
        }
        description="Review the query details below, then create a quotation from the products marked ready."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {query?.queryCode ? (
              <Badge
                variant="outline"
                className="px-3 py-1.5 font-mono text-sm font-semibold tracking-wide"
              >
                {query.queryCode}
              </Badge>
            ) : null}
            <BackButton fallback={`/queries/${queryId}`} />
          </div>
        }
      />

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Building2 className="h-8 w-8 shrink-0 text-primary!" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Company</div>
              <div className="truncate font-semibold text-foreground">
                {ci.name || "—"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <MapPin className="h-8 w-8 shrink-0 text-accent-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Location</div>
              <div className="truncate font-semibold text-foreground">
                {ci.location || "—"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Package className="h-8 w-8 shrink-0 text-success!" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                Products ready
              </div>
              <div className="font-semibold text-foreground">
                {prods.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Company Information - Read only */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Company Information
            <Badge variant="secondary" className="ml-1 font-normal">
              Read only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Company name
              </div>
              <div className="mt-1 font-medium text-foreground">
                {ci.name || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Location
              </div>
              <div className="mt-1 font-medium text-foreground">
                {ci.location || "—"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Purchase managers
              </div>
              <div className="mt-1 space-y-0.5 text-foreground">
                {(ci.purchaseManagers || []).length > 0
                  ? (ci.purchaseManagers || []).map((m, i) => (
                      <div key={i}>
                        {m.name || "–"}
                        {m.phone ? ` • ${m.phone}` : ""}
                        {m.email ? ` • ${m.email}` : ""}
                      </div>
                    ))
                  : ci.purchase_manager_name || ci.purchase_manager_phone
                    ? `${ci.purchase_manager_name || "–"} • ${ci.purchase_manager_phone || ""}`
                    : "–"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Billing address
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-foreground">
                {(ci.billingAddress || ci.address || "").trim() || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Shipping address
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-foreground">
                {(ci.shippingAddress || ci.address || "").trim() || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Remark - Read only */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Remark
            <Badge variant="secondary" className="ml-1 font-normal">
              Read only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Label>Remark</Label>
          <Textarea
            value={remark}
            rows={3}
            placeholder="No remark"
            disabled
            readOnly
          />
        </CardContent>
      </Card>

      {/* 3. Add product + Products table */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-muted-foreground" />
            Products
            <Badge variant="secondary" className="ml-1 font-normal">
              Ready for quotation only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Products table */}
          {prods.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead style={{ width: 60 }}>#</TableHead>
                    <TableHead>Product name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead style={{ width: 100 }}>Quantity</TableHead>
                    <TableHead style={{ width: 80 }}>Unit</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>GST %</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead style={{ width: 120 }}>Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prods.map((p, index) => {
                    const productRef =
                      typeof p.product_id === "object" ? p.product_id : null;
                    const snapshotImages = Array.isArray(p.images)
                      ? p.images
                      : [];
                    const productRefImages = Array.isArray(productRef?.images)
                      ? productRef.images
                      : [];
                    const allImages =
                      (snapshotImages.length
                        ? snapshotImages
                        : productRefImages) || [];
                    const imageUrls = allImages
                      .map((img) => getImageUrl(img))
                      .filter((src) => !!src);
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{p.productName || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {p.description || productRef?.shortDescription || "—"}
                        </TableCell>
                        <TableCell>
                          {p.quantity != null ? p.quantity : "—"}
                        </TableCell>
                        <TableCell>{p.unit || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {formatVariants(p.variants)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {productRef?.hsnNumber || p.hsnNumber || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {productRef?.gstPercentage != null
                            ? `${productRef.gstPercentage}%`
                            : p.gstPercentage != null
                              ? `${p.gstPercentage}%`
                              : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.remark || "—"}
                        </TableCell>
                        <TableCell>
                          {imageUrls.length > 0 ? (
                            <div
                              role="button"
                              tabIndex={0}
                              className="inline-flex flex-wrap items-center gap-1"
                              style={{ cursor: "pointer", maxWidth: 140 }}
                              onClick={() => {
                                setExpandedImages(imageUrls);
                                setExpandedImageIndex(0);
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                (setExpandedImages(imageUrls),
                                setExpandedImageIndex(0))
                              }
                              aria-label="View images"
                            >
                              {imageUrls.slice(0, 2).map((src, i) => (
                                <div
                                  key={i}
                                  className="flex-shrink-0 overflow-hidden rounded border border-border"
                                  style={{ width: 40, height: 40 }}
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-full w-full"
                                    style={{ objectFit: "cover" }}
                                  />
                                </div>
                              ))}
                              {imageUrls.length > 2 && (
                                <div
                                  className="flex flex-shrink-0 items-center justify-center rounded border border-border bg-muted text-xs font-bold text-primary!"
                                  style={{ width: 40, height: 40 }}
                                >
                                  +{imageUrls.length - 2}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <ImageOff className="h-4 w-4" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
              <Package className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-0 text-sm text-muted-foreground">
                No products on this query.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 mt-6 flex flex-col items-stretch justify-end gap-2 rounded-lg border border-border bg-card/95 p-3 backdrop-blur sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/queries/${queryId}`)}
        >
          Back to Query
        </Button>
        {canSubmitQuotation && (
          <Button
            type="button"
            variant="success"
            onClick={handleSubmit}
            disabled={submitting || products.length === 0}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Create Quotation
              </>
            )}
          </Button>
        )}
      </div>

      <Dialog
        open={expandedImages.length > 0}
        onOpenChange={(o) => !o && setExpandedImages([])}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Image{" "}
              {expandedImages.length > 1
                ? `${expandedImageIndex + 1} / ${expandedImages.length}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="relative p-3 text-center">
            {expandedImages.length > 0 && (
              <>
                {expandedImages.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full"
                      onClick={() =>
                        setExpandedImageIndex((i) =>
                          i <= 0 ? expandedImages.length - 1 : i - 1,
                        )
                      }
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full"
                      onClick={() =>
                        setExpandedImageIndex((i) =>
                          i >= expandedImages.length - 1 ? 0 : i + 1,
                        )
                      }
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                <img
                  src={expandedImages[expandedImageIndex]}
                  alt=""
                  className="mx-auto rounded"
                  style={{ maxHeight: "80vh", objectFit: "contain" }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuotationGenerate;
