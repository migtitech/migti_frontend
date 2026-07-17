import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import queryNewProductService from "../../services/queryNewProductService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader, PageHeader } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
  Badge,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const ProductLeadView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() =>
          queryNewProductService.getById(id),
        );
        const data = res?.data?.data ?? res?.data ?? res;
        setProduct(data);
      } catch (err) {
        setError(err?.message || "Failed to fetch product");
        toastError(err?.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading product..." />
        </CardContent>
      </Card>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error || "Product not found."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate("/product-lead")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Product Lead
        </Button>
      </div>
    );
  }

  const detailRows = [
    { key: "Name", value: product.name, highlight: true },
    { key: "Unique ID", value: product.uniqueId || "-" },
    { key: "Model Number", value: product.modelNumber || "-" },
    { key: "HSN Number", value: product.hsnNumber || "-", highlight: true },
    { key: "Unit", value: product.unit || "-" },
    {
      key: "Created At",
      value: dateTimeFormatter(product.createdAt, "-"),
    },
  ];

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const images = product?.images || [];

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/product-lead")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Product Lead
        </Button>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {product.name}
            {product.uniqueId && (
              <Badge variant="info">{product.uniqueId}</Badge>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableBody>
                    {detailRows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={cn(
                          row.highlight && "bg-amber-50 dark:bg-amber-950/30",
                        )}
                      >
                        <TableCell
                          className={cn(
                            "w-[35%] whitespace-nowrap font-semibold text-muted-foreground",
                            row.highlight && "text-foreground",
                          )}
                        >
                          {row.key}
                        </TableCell>
                        <TableCell
                          className={cn(row.highlight && "font-semibold")}
                        >
                          {row.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <Badge key={i} className="px-3 py-1 text-sm">
                      {v}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <CardTitle>Images</CardTitle>
              {images.length > 0 && (
                <Badge variant="secondary">
                  {images.length} photo{images.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, index) => {
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
                        className="h-[120px] w-[120px] cursor-pointer overflow-hidden rounded-lg border border-border"
                      >
                        <img
                          src={src}
                          width={120}
                          height={120}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No images uploaded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={!!expandedImage}
        onOpenChange={(open) => !open && setExpandedImage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image</DialogTitle>
          </DialogHeader>
          <div className="p-1 text-center">
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

export default ProductLeadView;
