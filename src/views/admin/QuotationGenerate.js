import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import queryService from "../../services/queryService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
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
      <Card className="mb-4 bg-muted/40">
        <CardContent className="p-4">
          <div className="mb-3 text-xs text-muted-foreground">
            Home&nbsp;/&nbsp;Queries&nbsp;/&nbsp;Generate Quotation
          </div>

          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/queries/${queryId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Query
              </Button>
              {query?.queryCode ? (
                <div className="rounded-full border border-border bg-accent px-3 py-2 text-sm font-bold tracking-wide text-primary!">
                  {query.queryCode}
                </div>
              ) : null}
            </div>
            <h4 className="text-lg font-semibold">
              Generate Quotation from Query
            </h4>
          </div>
        </CardContent>
      </Card>

      {/* 1. Company Information - Read only */}
      <Card className="mb-4">
        <CardHeader className="border-b border-border py-4">
          <div className="text-base font-semibold">
            1. Company Information{" "}
            <span className="font-normal text-muted-foreground">
              (Read only)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="divide-y divide-border">
            <div className="flex justify-between py-2">
              <strong>Company name</strong>
              <span>{ci.name || "-"}</span>
            </div>
            <div className="flex justify-between py-2">
              <strong>Location</strong>
              <span>{ci.location || "-"}</span>
            </div>
            <div className="py-2">
              <strong>Purchase managers</strong>
              <div className="mt-1">
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
            <div className="py-2">
              <strong>Billing address</strong>
              <div className="mt-1 whitespace-pre-wrap break-words">
                {(ci.billingAddress || ci.address || "").trim() || "-"}
              </div>
            </div>
            <div className="py-2">
              <strong>Shipping address</strong>
              <div className="mt-1 whitespace-pre-wrap break-words">
                {(ci.shippingAddress || ci.address || "").trim() || "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Remark - Read only */}
      <Card className="mb-4">
        <CardHeader className="border-b border-border py-4">
          <div className="text-base font-semibold">
            2. Remark{" "}
            <span className="font-normal text-muted-foreground">
              (Read only)
            </span>
          </div>
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
      <Card className="mb-4">
        <CardHeader className="border-b border-border py-4">
          <div className="text-base font-semibold">
            3. Products{" "}
            <span className="font-normal text-muted-foreground">
              (Ready for quotation only)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Products table */}
          {prods.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
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
                            <span className="text-sm text-muted-foreground">
                              —
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
            <p className="mb-0 text-muted-foreground">
              No products on this query.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
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
              "Create Quotation"
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
