import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader, EmptyState } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "../../components/ui";
import { productSalesList } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ProductSalesView = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const product = productSalesList.find((p) => p.sku === sku);

  if (!product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product not found" />
        <EmptyState
          title="No such product"
          message="This sample product record doesn't exist."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/sales-master/product-sales-list")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Product Sales List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description="Product sales detail — sample data for UI preview."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales-master/product-sales-list")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Product Sales List
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              SKU
            </p>
            <p className="text-sm font-medium">{product.sku}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Category
            </p>
            <p className="text-sm font-medium">{product.category}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Units Sold
            </p>
            <p className="text-sm font-medium">{product.unitsSold}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Avg Rate
            </p>
            <p className="text-sm font-medium tabular-nums">
              {formatINR(product.avgRate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Revenue
            </p>
            <p className="text-sm font-medium tabular-nums">
              {formatINR(product.revenue)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSalesView;
