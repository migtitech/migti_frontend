import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import subcategoryService from "../../services/subcategoryService";
import { Loader, PageHeader, StatusLabel } from "../../components";
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
  <div className="flex items-center justify-between gap-4 py-3">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{children}</span>
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
          <Button onClick={() => navigate("/subcategories")}>
            Back to Subcategories
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!subcategory) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Subcategory not found</h4>
          <Button onClick={() => navigate("/subcategories")}>
            Back to Subcategories
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categoryId = subcategory.category?._id || subcategory.category || null;
  const imageSrc =
    subcategory.imageDisplayUrl || subcategory.image || undefined;

  const handleBack = () => {
    if (categoryId) {
      navigate(`/categories/${categoryId}`);
      return;
    }
    navigate("/subcategories");
  };

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader
        title={subcategory.name}
        description={subcategory.subcategoryCode || undefined}
        actions={
          <Button onClick={() => navigate(`/subcategories/edit/${id}`)}>
            <Pencil className="h-4 w-4" />
            Edit Subcategory
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Subcategory Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={imageSrc} alt={subcategory.name} />
              <AvatarFallback>
                {getSubcategoryAvatarLabel(subcategory.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <dl className="divide-y divide-border">
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
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubcategoryView;
