import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Award,
  Building2,
  Eye,
  EyeOff,
  IndianRupee,
  Layers,
  Package,
  Pencil,
  Store,
  Trophy,
  User,
} from "lucide-react";
import PageHeader from "../../components/PageHeader/PageHeader";
import BackButton from "../../components/BackButton";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DataTable from "../../components/DataTable/DataTable";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui";
import {
  useRateMasterProducts,
  getVariant,
  rankQuotes,
  formatDate,
  salesRate,
} from "./rateMasterStore";

/**
 * Single variant "submitted rates" view — reached by clicking a variant on the
 * Rate Master variants page. Shows every supplier that submitted a rate for
 * this one variant, ranked L1 / L2 / L3 by GST-inclusive landed price, along
 * with who submitted each quote and when. Mock/demo data only, no backend.
 */
const rupee = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const rankVariant = (rank) =>
  rank === "L1" ? "success" : rank === "L2" ? "info" : "warning";

const RateMasterVariantDetail = () => {
  const { productId, variantId } = useParams();
  const navigate = useNavigate();
  // Subscribe so the page re-renders if the store changes underneath us.
  useRateMasterProducts();
  const { product, variant } = getVariant(productId, variantId);

  const rankedQuotes = useMemo(
    () => rankQuotes(variant?.supplierQuotes || []),
    [variant],
  );

  const l1 = rankedQuotes[0] || null;

  const columns = useMemo(
    () => [
      {
        key: "rank",
        label: "Rank",
        width: 80,
        align: "center",
        render: (row) => (
          <Badge variant={rankVariant(row.rank)} className="font-semibold">
            {row.rank}
          </Badge>
        ),
      },
      {
        key: "supplier",
        label: "Supplier",
        render: (row) => (
          <div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {row.supplier}
              {row.supplierCode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/suppliers/${row.supplierId}`);
                  }}
                  title={`View ${row.supplier} (${row.supplierCode})`}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer font-mono hover:bg-accent"
                  >
                    {row.supplierCode}
                  </Badge>
                </button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.contact} · {row.city}
            </div>
          </div>
        ),
      },
      {
        key: "quotedRate",
        label: "Quoted Rate",
        align: "right",
        render: (row) => rupee(row.quotedRate),
      },
      {
        key: "gst",
        label: "GST",
        align: "right",
        render: (row) => `${row.gst}%`,
      },
      {
        key: "effectiveRate",
        label: "Landed Rate",
        align: "right",
        render: (row) => (
          <span
            className={row.rank === "L1" ? "font-semibold text-success!" : ""}
          >
            {rupee(row.effectiveRate)}
          </span>
        ),
      },
      {
        key: "submittedBy",
        label: "Submitted By",
        render: (row) => (
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {row.submittedBy}
          </span>
        ),
      },
      {
        key: "submittedAt",
        label: "Submitted On",
        render: (row) => formatDate(row.submittedAt),
      },
    ],
    [navigate],
  );

  if (!product || !variant) {
    return (
      <div>
        <PageHeader title="Rate Master" description="Variant not found." />
        <BackButton fallback={`/master/rate-master/${productId}`} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            {product.name} — {variant.name}
          </span>
        }
        description={`${product.category} · Product ${product.id} · Variant ${variant.code}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                navigate(`/master/rate-master/${productId}?set=${variantId}`)
              }
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Set Rate
            </Button>
            <BackButton fallback={`/master/rate-master/${productId}`} />
          </div>
        }
      />

      {/* Variant summary strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Package className="h-8 w-8 shrink-0 text-primary!" />
            <div>
              <div className="text-xs text-muted-foreground">Variant Code</div>
              <div className="font-semibold text-foreground">
                {variant.code}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <IndianRupee className="h-8 w-8 shrink-0 text-success!" />
            <div>
              <div className="text-xs text-muted-foreground">
                Current Selling Rate
              </div>
              <div className="font-semibold text-foreground">
                {variant.rate != null ? rupee(variant.rate) : "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-8 w-8 shrink-0 text-warning!" />
            <div>
              <div className="text-xs text-muted-foreground">
                Best (L1) Supplier
              </div>
              <div className="font-semibold text-foreground">
                {l1 ? l1.supplier : "—"}
              </div>
              {l1 && (
                <div className="text-xs text-muted-foreground">
                  {rupee(l1.effectiveRate)} landed
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Store className="h-8 w-8 shrink-0 text-primary!" />
            <div>
              <div className="text-xs text-muted-foreground">Sales Master</div>
              {variant.visibleToSales !== false ? (
                <>
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Eye className="h-3.5 w-3.5 text-success!" />
                    {salesRate(variant) != null
                      ? rupee(salesRate(variant))
                      : "Shown"}
                  </div>
                  {Number(variant.markupValue) !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      {variant.markupType === "amount"
                        ? `${variant.markupValue > 0 ? "+" : ""}₹${variant.markupValue}`
                        : `${variant.markupValue > 0 ? "+" : ""}${variant.markupValue}%`}{" "}
                      on base
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <EyeOff className="h-3.5 w-3.5" />
                  Hidden
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Award className="h-8 w-8 shrink-0 text-accent-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Rate Status</div>
              <div className="mt-1">
                <StatusBadge
                  status={
                    variant.status === "priced"
                      ? "active"
                      : variant.status === "expiring"
                        ? "expired"
                        : "pending"
                  }
                  children={
                    variant.status === "priced"
                      ? "Priced"
                      : variant.status === "expiring"
                        ? "Expiring Soon"
                        : "Rate Pending"
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Supplier Rates</CardTitle>
          <CardDescription>
            {rankedQuotes.length} supplier
            {rankedQuotes.length === 1 ? "" : "s"} submitted a rate for this
            variant. Ranked L1 / L2 / L3 by GST-inclusive landed rate — L1 is
            the cheapest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={rankedQuotes}
            rowKey={(row) => row.id}
            showSearch={false}
            exportFileName={`${variant.code}-supplier-rates`}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RateMasterVariantDetail;
