import React, { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import productService from "../../services/productService";
import { getAssetsUrl } from "../../api/endpoints";
import { toastError } from "../../utils/toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  Spinner,
} from "../../components/ui";

const sidebarWidth = 420;

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const QueryProductFindSidebar = ({
  isOpen = false,
  onToggle = () => {},
  onSelectProduct = () => {},
  showFloatingToggle = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [hsnFilter, setHsnFilter] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({
        pageNumber: 1,
        pageSize: 50,
        status: "hod_approved",
        search: nameFilter || undefined,
        hsnNumber: hsnFilter || undefined,
      });
      const inner = res?.data ?? res;
      setItems(inner?.data?.products || inner?.products || []);
    } catch (err) {
      toastError(err?.message || "Failed to load products");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [nameFilter, hsnFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const firstImageUrl = (product) => {
    const list = product?.images || [];
    if (!list.length) return "";
    return getImageUrl(list[0]);
  };

  return (
    <>
      {showFloatingToggle && (
        <div
          className="fixed bottom-4 z-[3000] transition-[right] duration-200"
          style={{ right: isOpen ? sidebarWidth + 12 : 12 }}
        >
          <Button type="button" onClick={onToggle}>
            {isOpen ? "Close Find Product" : "Find Product"}
          </Button>
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={(open) => !open && onToggle()}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-[420px]">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>Products</SheetTitle>
              <Badge variant="info">{items.length}</Badge>
            </div>
          </SheetHeader>

          <SheetBody>
            <p className="mb-2 text-sm text-muted-foreground">
              Filter by name or HSN, then use the import icon below each image.
            </p>

            <div className="mb-2 space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="Product name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <div className="mb-4 space-y-1.5">
              <Label className="text-xs">HSN number</Label>
              <Input
                placeholder="HSN"
                value={hsnFilter}
                onChange={(e) => setHsnFilter(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="py-4 text-center">
                <Spinner size="sm" className="mx-auto" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products match.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((p) => {
                  const url = firstImageUrl(p);
                  return (
                    <Card key={p._id || p.uniqueId}>
                      <CardContent className="px-2 py-2">
                        <div className="flex gap-3">
                          <div className="flex w-[92px] flex-shrink-0 flex-col items-center">
                            {url ? (
                              <img
                                src={url}
                                alt={p.name || "Product"}
                                className="h-[88px] w-[88px] rounded border border-border object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-[88px] w-[88px] items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground">
                                No image
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="mt-2 h-9 w-9"
                              title="Import into form"
                              onClick={() => onSelectProduct(p)}
                            >
                              <Download className="h-5 w-5" />
                            </Button>
                          </div>
                          <div className="min-w-0 flex-grow break-words">
                            <div className="text-sm text-muted-foreground">
                              Title
                            </div>
                            <div className="font-semibold text-foreground">
                              {p.name?.trim() ? p.name : "—"}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Description
                            </div>
                            <div
                              className="overflow-auto text-sm leading-snug"
                              style={{ maxHeight: 84 }}
                            >
                              {p.shortDescription?.trim()
                                ? p.shortDescription
                                : "—"}
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">
                                HSN:{" "}
                              </span>
                              <span>
                                {p.hsnNumber?.trim() ? p.hsnNumber : "—"}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Unit:{" "}
                              </span>
                              <span>
                                {p.unit != null && String(p.unit).trim()
                                  ? p.unit
                                  : "—"}
                              </span>
                            </div>
                            {p.productCode && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  Code:{" "}
                                </span>
                                <span>{p.productCode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QueryProductFindSidebar;
