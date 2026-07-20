import React from "react";
import { useParams } from "react-router-dom";
import {
  BadgePercent,
  Boxes,
  CheckCircle2,
  Hash,
  Layers,
  Package,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import { BackButton, PageHeader, StatusBadge } from "../../components";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import {
  AVAILABILITY_META,
  formatINR,
  productSaleCatalog,
  summarizeProduct,
} from "../../data/productSaleCatalog";

const availabilityBadge = (key) => {
  const meta = AVAILABILITY_META[key] || AVAILABILITY_META.out_of_stock;
  return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
};

const StatTile = ({ icon: Icon, label, value, accent = "primary" }) => {
  const accentMap = {
    primary: "bg-primary/10 text-primary!",
    info: "bg-info/10 text-info!",
    success: "bg-success/10 text-success!",
    warning: "bg-warning/10 text-warning!",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          accentMap[accent] || accentMap.primary,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-base font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
};

const MetaChip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
    <Icon className="h-3.5 w-3.5" />
    {children}
  </span>
);

const VariantCard = ({ variant, unit }) => {
  const meta = AVAILABILITY_META[variant.availability] || {};
  const saving =
    Number(variant.mrp || 0) - Number(variant.sellingPrice || 0) > 0
      ? Number(variant.mrp) - Number(variant.sellingPrice)
      : 0;
  const sellable =
    variant.availability === "in_stock" ||
    variant.availability === "low_stock" ||
    variant.availability === "made_to_order";

  return (
    <Card
      className={cn(
        "overflow-hidden border-border transition-shadow hover:shadow-md",
        variant.availability === "out_of_stock" && "opacity-75",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b bg-muted/40 py-3">
        <div className="min-w-0">
          <CardTitle
            className="truncate text-sm font-semibold"
            title={variant.label}
          >
            {variant.label}
          </CardTitle>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            {variant.sku}
          </div>
        </div>
        {availabilityBadge(variant.availability)}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
              Selling price
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatINR(variant.sellingPrice)}
              </span>
              <span className="text-sm text-muted-foreground">/ {unit}</span>
            </div>
            {Number(variant.mrp) > Number(variant.sellingPrice) && (
              <div className="mt-0.5 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {formatINR(variant.mrp)}
                </span>
                {saving > 0 && (
                  <span className="font-medium text-success!">
                    save {formatINR(saving)}
                  </span>
                )}
              </div>
            )}
          </div>
          {variant.discountPct > 0 && (
            <div className="flex flex-col items-center rounded-xl bg-success-muted px-3 py-2 text-success!">
              <BadgePercent className="h-4 w-4" />
              <span className="text-lg font-bold leading-none">
                {variant.discountPct}%
              </span>
              <span className="text-[0.6rem] uppercase tracking-wide">off</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Availability</span>
            <span className="font-medium text-foreground">
              {meta.label || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">In stock</span>
            <span className="font-medium text-foreground">
              {variant.stock > 0 ? `${variant.stock} ${unit}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">MRP</span>
            <span className="font-medium text-foreground">
              {formatINR(variant.mrp)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Min. order</span>
            <span className="font-medium text-foreground">
              {variant.moq} {unit}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
            sellable
              ? "bg-success-muted text-success!"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {sellable
            ? "Ready to quote to customer"
            : "Currently unavailable — do not commit delivery"}
        </div>
      </CardContent>
    </Card>
  );
};

const ProductSaleView = () => {
  const { id } = useParams();
  const product = productSaleCatalog.find((p) => p.id === id);

  if (!product) {
    return (
      <div>
        <Card className="mb-3">
          <CardContent className="flex items-center justify-between gap-2 py-2">
            <span className="text-sm text-muted-foreground">
              Product not found
            </span>
            <BackButton fallback="/product-sale-list" />
          </CardContent>
        </Card>
        <PageHeader
          title="Product not found"
          description="This product is not in the sample sale catalog."
        />
      </div>
    );
  }

  const summary = summarizeProduct(product);

  return (
    <div>
      <Card className="mb-3">
        <CardContent className="flex items-center justify-between gap-2 py-2">
          <nav className="flex min-w-0 flex-shrink items-center gap-1 overflow-hidden text-sm text-muted-foreground">
            <a href="#/" className="hover:text-foreground">
              Home
            </a>
            <span aria-hidden>/</span>
            <a href="#/product-sale-list" className="hover:text-foreground">
              Product Sale List
            </a>
            <span aria-hidden>/</span>
            <span className="inline-block max-w-[12rem] truncate text-foreground">
              {product.name}
            </span>
          </nav>
          <BackButton fallback="/product-sale-list" />
        </CardContent>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <div className="relative border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex flex-wrap items-start gap-4">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-24 w-24 shrink-0 rounded-2xl border border-border object-cover shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary! shadow-sm">
                <Package className="h-10 w-10" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold leading-tight text-foreground">
                  {product.name}
                </h2>
                {availabilityBadge(summary.bestAvailability)}
              </div>
              <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
                {product.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <MetaChip icon={Tag}>{product.brand}</MetaChip>
                <MetaChip icon={Boxes}>{product.category}</MetaChip>
                <MetaChip icon={Hash}>HSN {product.hsnNumber}</MetaChip>
                <MetaChip icon={ShieldCheck}>{product.warranty}</MetaChip>
                <MetaChip icon={Truck}>{product.leadTime}</MetaChip>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                Starting from
              </div>
              <div className="text-3xl font-bold text-primary!">
                {formatINR(summary.minPrice)}
              </div>
              {summary.maxDiscount > 0 && (
                <Badge variant="success" className="mt-1 gap-1">
                  <BadgePercent className="h-3 w-3" />
                  up to {summary.maxDiscount}% off
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={Layers}
              label="Variants"
              value={summary.variantCount}
              accent="primary"
            />
            <StatTile
              icon={Boxes}
              label="Total stock"
              value={
                summary.totalStock > 0
                  ? `${summary.totalStock} ${product.unit}`
                  : "On request"
              }
              accent="info"
            />
            <StatTile
              icon={BadgePercent}
              label="Best discount"
              value={`${summary.maxDiscount}%`}
              accent="warning"
            />
            <StatTile
              icon={Package}
              label="Price range"
              value={
                summary.minPrice === summary.maxPrice
                  ? formatINR(summary.minPrice)
                  : `${formatINR(summary.minPrice)}–${formatINR(summary.maxPrice)}`
              }
              accent="success"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary!" />
        <h3 className="text-lg font-semibold text-foreground">
          Variants &amp; pricing
        </h3>
        <Badge variant="secondary">{summary.variantCount}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {product.variants.map((v) => (
          <VariantCard key={v.sku} variant={v} unit={product.unit} />
        ))}
      </div>
    </div>
  );
};

export default ProductSaleView;
