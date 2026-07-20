import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgePercent,
  Boxes,
  Eye,
  Layers,
  PackageCheck,
  Search,
  Tag,
} from "lucide-react";
import { DataTable, PageHeader, StatCard, StatusBadge } from "../../components";
import { Badge, Button, Label, Select } from "../../components/ui";
import {
  AVAILABILITY_META,
  formatINR,
  productSaleCatalog,
  productSaleCategories,
  summarizeProduct,
} from "../../data/productSaleCatalog";

const availabilityBadge = (key) => {
  const meta = AVAILABILITY_META[key] || AVAILABILITY_META.out_of_stock;
  return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
};

const ProductImage = ({ src, alt }) =>
  src ? (
    <img
      src={src}
      alt={alt}
      className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
      <Boxes className="h-5 w-5" />
    </span>
  );

const ProductSaleList = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");

  const rows = useMemo(() => {
    return productSaleCatalog
      .map((p) => ({ ...p, summary: summarizeProduct(p) }))
      .filter((p) => (category ? p.category === category : true))
      .filter((p) =>
        availability ? p.summary.bestAvailability === availability : true,
      );
  }, [category, availability]);

  const kpis = useMemo(() => {
    const totalProducts = productSaleCatalog.length;
    const totalVariants = productSaleCatalog.reduce(
      (s, p) => s + (p.variants?.length || 0),
      0,
    );
    const inStock = productSaleCatalog.filter((p) => {
      const b = summarizeProduct(p).bestAvailability;
      return b === "in_stock" || b === "low_stock";
    }).length;
    const maxDiscount = productSaleCatalog.reduce(
      (m, p) => Math.max(m, summarizeProduct(p).maxDiscount),
      0,
    );
    return { totalProducts, totalVariants, inStock, maxDiscount };
  }, []);

  const openDetail = (row) => navigate(`/product-sale-list/${row.id}`);

  const columns = [
    {
      key: "product",
      label: "Product",
      sortable: true,
      sortValue: (row) => row.name || "",
      exportValue: (row) => row.name || "",
      render: (row) => (
        <div className="flex items-center gap-3">
          <ProductImage src={row.image} alt={row.name} />
          <div className="min-w-0">
            <div
              className="max-w-[16rem] truncate font-semibold text-foreground"
              title={row.name}
            >
              {row.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.brand} · {row.unit}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className="font-normal">
          {row.category}
        </Badge>
      ),
    },
    {
      key: "variants",
      label: "Variants",
      align: "center",
      sortValue: (row) => row.summary.variantCount,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          {row.summary.variantCount}
        </span>
      ),
    },
    {
      key: "price",
      label: "Selling price",
      align: "right",
      sortValue: (row) => row.summary.minPrice ?? 0,
      exportValue: (row) =>
        row.summary.minPrice === row.summary.maxPrice
          ? formatINR(row.summary.minPrice)
          : `${formatINR(row.summary.minPrice)} – ${formatINR(row.summary.maxPrice)}`,
      render: (row) => {
        const { minPrice, maxPrice } = row.summary;
        return (
          <div className="whitespace-nowrap font-semibold text-foreground">
            {minPrice === maxPrice ? (
              formatINR(minPrice)
            ) : (
              <>
                <span className="text-xs font-normal text-muted-foreground">
                  from{" "}
                </span>
                {formatINR(minPrice)}
              </>
            )}
          </div>
        );
      },
    },
    {
      key: "discount",
      label: "Best discount",
      align: "right",
      sortValue: (row) => row.summary.maxDiscount,
      exportValue: (row) => `${row.summary.maxDiscount}%`,
      render: (row) =>
        row.summary.maxDiscount > 0 ? (
          <Badge variant="success" className="gap-1">
            <BadgePercent className="h-3 w-3" />
            {row.summary.maxDiscount}% off
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "availability",
      label: "Availability",
      sortValue: (row) => row.summary.bestAvailability,
      exportValue: (row) =>
        AVAILABILITY_META[row.summary.bestAvailability]?.label || "",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {availabilityBadge(row.summary.bestAvailability)}
          <span className="text-xs text-muted-foreground">
            {row.summary.totalStock > 0
              ? `${row.summary.totalStock} in stock`
              : "Stock on request"}
          </span>
        </div>
      ),
    },
    {
      key: "view",
      label: "",
      align: "right",
      toggleable: false,
      exportable: false,
      stopRowClick: true,
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDetail(row)}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Sale List"
        description="Live rate & availability sheet — quote customers straight from this list. Sample data for preview."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Products"
          value={kpis.totalProducts}
          icon={Boxes}
          color="primary"
        />
        <StatCard
          title="Variants"
          value={kpis.totalVariants}
          icon={Layers}
          color="info"
        />
        <StatCard
          title="Available"
          value={kpis.inStock}
          icon={PackageCheck}
          color="success"
        />
        <StatCard
          title="Best discount"
          value={`${kpis.maxDiscount}%`}
          icon={BadgePercent}
          color="warning"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:items-end">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" /> Category
          </Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {productSaleCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" /> Availability
          </Label>
          <Select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="">Any availability</option>
            {Object.entries(AVAILABILITY_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setCategory("");
              setAvailability("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={openDetail}
        searchPlaceholder="Search product, brand, category…"
        exportFileName="product-sale-list"
        emptyTitle="No products match these filters"
      />
    </div>
  );
};

export default ProductSaleList;
