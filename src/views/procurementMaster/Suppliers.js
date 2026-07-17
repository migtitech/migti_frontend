import React, { useRef, useState } from "react";
import { Factory, CheckCircle2, XCircle, Star, Plus } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Label,
  Select,
  Input,
} from "../../components/ui";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { statusVariant } from "./components/statusFormatters";
import {
  assignedCategories,
  suppliers as initialSuppliers,
} from "../../data/procurementMasterDummyData";
import { toastSuccess, toastError } from "../../utils/toast";

const columns = [
  { key: "name", label: "Supplier", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "city", label: "City", sortable: true },
  { key: "contact", label: "Contact Person", sortable: true },
  { key: "phone", label: "Phone" },
  {
    key: "rating",
    label: "Rating",
    align: "right",
    render: (row) => `${row.rating} / 5`,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const emptyForm = {
  name: "",
  category: assignedCategories[0] || "",
  city: "",
  contact: "",
  phone: "",
};

/**
 * Suppliers scoped to this procurement manager's assigned categories only —
 * both the listing and the "new supplier" form only allow the categories
 * they've been assigned. Sample data for UI preview, not wired to backend.
 */
const Suppliers = () => {
  const [supplierList, setSupplierList] = useState(
    initialSuppliers.filter((s) => assignedCategories.includes(s.category)),
  );
  const [form, setForm] = useState(emptyForm);
  const nextSupplierIdRef = useRef(initialSuppliers.length + 1);

  const active = supplierList.filter((s) => s.status === "active");

  const handleChange = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      toastError("Supplier name and category are required.");
      return;
    }
    const newSupplier = {
      id: `SUP-P${nextSupplierIdRef.current++}`,
      ...form,
      rating: 0,
      status: "active",
    };
    setSupplierList((prev) => [newSupplier, ...prev]);
    toastSuccess(
      `Supplier "${form.name}" added under ${form.category} (sample UI, not saved).`,
    );
    setForm(emptyForm);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description={`Suppliers for your assigned categories only: ${assignedCategories.join(", ")}. Sample data for UI preview.`}
      />
      <ProcurementMasterSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Suppliers"
          value={supplierList.length}
          icon={Factory}
          color="primary"
        />
        <StatCard
          title="Active"
          value={active.length}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Inactive"
          value={supplierList.length - active.length}
          icon={XCircle}
          color="warning"
        />
        <StatCard
          title="Avg Rating"
          value={
            supplierList.length
              ? (
                  supplierList.reduce((sum, s) => sum + s.rating, 0) /
                  supplierList.length
                ).toFixed(1)
              : "—"
          }
          icon={Star}
          color="info"
        />
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Add New Supplier</CardTitle>
            <CardDescription>
              Only your assigned categories ({assignedCategories.join(", ")})
              can be selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="sup-name">Supplier Name</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => handleChange({ name: e.target.value })}
                placeholder="e.g. Malwa Steel Traders"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-category">Category</Label>
              <Select
                id="sup-category"
                value={form.category}
                onChange={(e) => handleChange({ category: e.target.value })}
              >
                {assignedCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-city">City</Label>
              <Input
                id="sup-city"
                value={form.city}
                onChange={(e) => handleChange({ city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-contact">Contact Person</Label>
              <Input
                id="sup-contact"
                value={form.contact}
                onChange={(e) => handleChange({ contact: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input
                id="sup-phone"
                value={form.phone}
                onChange={(e) => handleChange({ phone: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Supplier
            </Button>
          </CardFooter>
        </Card>
      </form>

      <DataTable
        columns={columns}
        rows={supplierList}
        rowKey={(r) => r.id}
        exportFileName="procurement-suppliers"
      />
    </div>
  );
};

export default Suppliers;
