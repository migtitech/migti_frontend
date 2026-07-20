import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, Info, Layers, Tags } from "lucide-react";
import categoryService from "../../services/categoryService";
import Filtered from "../../filtered/Filtered";
import { Loader, StatusLabel, StatusBadge, BackButton } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

/** InfoCard: card with an icon-chip + border-b header (shared "tile" system). */
const InfoCard = ({ icon: Icon, title, action, className, children }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary!" />
          </span>
        )}
        <CardTitle className="text-sm">{title}</CardTitle>
      </div>
      {action}
    </CardHeader>
    {children}
  </Card>
);

const getBrandAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getBrandIconSrc = (brand) =>
  brand?.iconDisplayUrl || brand?.iconUrl || brand?.logoDisplayUrl || undefined;

const matchesSearch = (searchTerm, ...values) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;
  return values.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(query),
  );
};

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">
      {children}
    </span>
  </div>
);

const CategoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => categoryService.getById(id));
        const payload = res?.data?.data || res?.data || res;
        setCategory(payload);
      } catch (err) {
        setError(err?.message || "Failed to load category");
        toastError(err?.message || "Failed to load category");
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
          <Loader message="Loading category..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => navigate("/categories")}>
            Back to Categories
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!category) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Category not found</h4>
          <Button onClick={() => navigate("/categories")}>
            Back to Categories
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subcategories = category.subcategories || [];
  const mappedBrands = category.brands || [];

  const filteredSubcategories = subcategories.filter((sub) =>
    matchesSearch(subcategorySearch, sub.name, sub.subcategoryCode),
  );

  const filteredMappedBrands = mappedBrands.filter((brand) =>
    matchesSearch(brandSearch, brand.name),
  );

  const categoryIconSrc =
    category.imageDisplayUrl || category.image || undefined;

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/categories" />
      </div>

      {/* Summary banner */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {categoryIconSrc ? (
                  <AvatarImage src={categoryIconSrc} alt={category.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {(category.name || "CT").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold leading-tight">
                    {category.name || "—"}
                  </h3>
                  <StatusBadge status={category.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {category.categoryCode || "Code pending"}
                  {category.group?.name ? ` · ${category.group.name}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-border border-t">
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Subcategories</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {subcategories.length}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Mapped brands</div>
              <div className="mt-0.5 text-lg font-semibold text-foreground">
                {mappedBrands.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InfoCard
          icon={Info}
          title="Category Details"
          className="flex h-full flex-col"
        >
          <CardContent className="divide-y divide-border">
            <DetailRow label="Category Code">
              <code>{category.categoryCode || "—"}</code>
            </DetailRow>
            <DetailRow label="Name">{category.name}</DetailRow>
            <DetailRow label="Group">{category.group?.name || "—"}</DetailRow>
            <DetailRow label="Description">
              {category.description || "—"}
            </DetailRow>
            <DetailRow label="Status">
              <StatusLabel status={category.status} />
            </DetailRow>
          </CardContent>
        </InfoCard>

        <InfoCard
          icon={Layers}
          title="Subcategories"
          className="flex h-full flex-col"
          action={
            <Button
              size="sm"
              onClick={() => navigate(`/sub-categories/new?category=${id}`)}
            >
              Add Subcategory
            </Button>
          }
        >
          <CardContent>
            {subcategories.length > 0 && (
              <div className="mb-3">
                <Filtered
                  searchTerm={subcategorySearch}
                  setSearchTerm={setSubcategorySearch}
                />
              </div>
            )}
            {subcategories.length > 0 ? (
              filteredSubcategories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubcategories.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell>
                          <code>{sub.subcategoryCode || "—"}</code>
                        </TableCell>
                        <TableCell>{sub.name ?? "—"}</TableCell>
                        <TableCell>
                          <StatusLabel status={sub.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/sub-categories/${sub._id}`)
                            }
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No subcategories found matching &quot;{subcategorySearch}
                  &quot;
                </p>
              )
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No subcategories
              </p>
            )}
          </CardContent>
        </InfoCard>
      </div>

      <InfoCard icon={Tags} title="Mapped Brands">
        <CardContent>
          {mappedBrands.length > 0 && (
            <div className="mb-3 max-w-sm">
              <Filtered
                searchTerm={brandSearch}
                setSearchTerm={setBrandSearch}
              />
            </div>
          )}
          {mappedBrands.length > 0 ? (
            filteredMappedBrands.length > 0 ? (
              <div className="max-h-[180px] overflow-auto">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {filteredMappedBrands.map((brand) => {
                    const iconSrc = getBrandIconSrc(brand);
                    return (
                      <div
                        key={brand._id}
                        className="rounded-lg border border-border p-2 text-center"
                      >
                        <Avatar className="mx-auto mb-1 h-10 w-10">
                          <AvatarImage src={iconSrc} alt={brand.name} />
                          <AvatarFallback>
                            {getBrandAvatarLabel(brand.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className="truncate text-sm font-medium text-foreground"
                          title={brand.name}
                        >
                          {brand.name}
                        </div>
                        <div className="mt-1">
                          <StatusLabel status={brand.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No brands found matching &quot;{brandSearch}&quot;
              </p>
            )
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No brands mapped
            </p>
          )}
        </CardContent>
      </InfoCard>
    </div>
  );
};

export default CategoryView;
