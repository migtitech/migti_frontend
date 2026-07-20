import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Info } from "lucide-react";
import subcategoryService from "../../services/subcategoryService";
import { Loader, StatusLabel, StatusBadge, BackButton } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const getSubcategoryAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">
      {children}
    </span>
  </div>
);

const SubcategoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subcategory, setSubcategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() =>
          subcategoryService.getById(id),
        );
        const payload = res?.data?.data || res?.data || res;
        setSubcategory(payload);
      } catch (err) {
        setError(err?.message || "Failed to load subcategory");
        toastError(err?.message || "Failed to load subcategory");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading subcategory..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <BackButton fallback="/sub-categories" />
        </CardContent>
      </Card>
    );
  }

  if (!subcategory) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Subcategory not found</h4>
          <BackButton fallback="/sub-categories" />
        </CardContent>
      </Card>
    );
  }

  const categoryId = subcategory.category?._id || subcategory.category || null;
  const imageSrc =
    subcategory.imageDisplayUrl || subcategory.image || undefined;

  return (
    <div>
      <div className="mb-4">
        <BackButton
          fallback={
            categoryId ? `/categories/${categoryId}` : "/sub-categories"
          }
        />
      </div>

      {/* Summary banner */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={imageSrc} alt={subcategory.name} />
                <AvatarFallback className="text-lg">
                  {getSubcategoryAvatarLabel(subcategory.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold leading-tight">
                    {subcategory.name || "—"}
                  </h3>
                  <StatusBadge status={subcategory.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {subcategory.subcategoryCode || "Code pending"}
                  {subcategory.category?.name
                    ? ` · ${subcategory.category.name}`
                    : ""}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(`/sub-categories/edit/${id}`)}>
              <Pencil className="h-4 w-4" />
              Edit Subcategory
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Info className="h-4 w-4 text-primary!" />
          </span>
          <CardTitle className="text-sm">Subcategory Details</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <DetailRow label="Subcategory Code">
            <code>{subcategory.subcategoryCode || "—"}</code>
          </DetailRow>
          <DetailRow label="Name">{subcategory.name}</DetailRow>
          <DetailRow label="Category">
            {categoryId ? (
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => navigate(`/categories/${categoryId}`)}
              >
                {subcategory.category?.name || "—"}
              </Button>
            ) : (
              subcategory.category?.name || "—"
            )}
          </DetailRow>
          <DetailRow label="Description">
            {subcategory.description || "—"}
          </DetailRow>
          <DetailRow label="Status">
            <StatusLabel status={subcategory.status} />
          </DetailRow>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubcategoryView;
