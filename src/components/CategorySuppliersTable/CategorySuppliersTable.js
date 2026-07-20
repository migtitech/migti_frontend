import React from "react";
import { Search } from "lucide-react";
import supplierService from "../../services/supplierService";
import EyeIcon from "../EyeIcon";
import Loader from "../Loader/Loader";
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui";

const dash = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (typeof v === "number" && Number.isNaN(v)) return "—";
  return v;
};

/** Load every supplier linked to a category (paged), used by the Suppliers tab. */
export const fetchAllSuppliersByCategory = async (categoryId) => {
  const all = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const res = await supplierService.getAll({
      pageNumber: page,
      pageSize: 100,
      category: categoryId,
    });
    const block = res?.data;
    const list = Array.isArray(block?.suppliers) ? block.suppliers : [];
    all.push(...list);
    hasNext = block?.pagination?.hasNextPage === true;
    page += 1;
    if (page > 50) break;
  }
  return all;
};

/**
 * Sample suppliers shown in the Suppliers tab when no real category-linked
 * suppliers are returned yet — gives the table proper rows for UI preview.
 * These are dummy records (ids are not real DB ids).
 */
export const DUMMY_CATEGORY_SUPPLIERS = [
  {
    _id: "dummy-sup-1",
    name: "Sharma Enterprises",
    shopname: "Sharma Electricals",
    phone_1: "9876543210",
    phone_2: "9123456780",
    email: "sales@sharmaent.in",
    other_contact: "Ramesh Sharma",
    label: "Preferred",
    shop_location: "Bhagirath Palace, Delhi",
    gst: "07ABCDE1234F1Z5",
    address: "Shop 12, Bhagirath Palace, Chandni Chowk, New Delhi - 110006",
    remark: "Bulk discount on orders above ₹50,000",
  },
  {
    _id: "dummy-sup-2",
    name: "Verma Traders",
    shopname: "Verma Hardware & Tools",
    phone_1: "9811122233",
    phone_2: "",
    email: "verma.traders@gmail.com",
    other_contact: "Sunil Verma",
    label: "Wholesale",
    shop_location: "Kashmere Gate, Delhi",
    gst: "07FGHIJ5678K2Z6",
    address: "1st Floor, Hamilton Road, Kashmere Gate, New Delhi - 110006",
    remark: "Fast delivery within NCR",
  },
  {
    _id: "dummy-sup-3",
    name: "National Supply Co.",
    shopname: "National Electronics",
    phone_1: "9900011122",
    phone_2: "0221234567",
    email: "info@nationalsupply.co.in",
    other_contact: "Anita Desai",
    label: "New",
    shop_location: "Lamington Road, Mumbai",
    gst: "27KLMNO9012P3Z7",
    address: "Shop 5, Lamington Road, Grant Road, Mumbai - 400007",
    remark: "Ask for updated rate card monthly",
  },
  {
    _id: "dummy-sup-4",
    name: "Gupta & Sons",
    shopname: "Gupta Industrial Supplies",
    phone_1: "9765432100",
    phone_2: "",
    email: "guptasons@rediffmail.com",
    other_contact: "Mahesh Gupta",
    label: "Preferred",
    shop_location: "SP Road, Bengaluru",
    gst: "29QRSTU3456V4Z8",
    address: "42, SP Road, Bengaluru - 560002",
    remark: "Credit terms: 15 days",
  },
  {
    _id: "dummy-sup-5",
    name: "Metro Distributors",
    shopname: "Metro Wholesale Mart",
    phone_1: "9845098450",
    phone_2: "9845098451",
    email: "orders@metrodist.in",
    other_contact: "Kavita Rao",
    label: "Wholesale",
    shop_location: "Ritchie Street, Chennai",
    gst: "33WXYZA7890B5Z9",
    address: "78, Ritchie Street, Mount Road, Chennai - 600002",
    remark: "GST invoice provided on all orders",
  },
];

export const isDummySupplierId = (id) =>
  typeof id === "string" && id.startsWith("dummy-sup-");

const SUPPLIER_SEARCH_FIELDS = [
  "name",
  "shopname",
  "phone_1",
  "phone_2",
  "email",
  "other_contact",
  "label",
  "shop_location",
  "gst",
  "address",
  "remark",
];

/** Category-linked suppliers table shared by Pro Bucket / Local Procurement detail. */
const CategorySuppliersTable = ({
  suppliers,
  loading,
  categoryName,
  navigate,
  isSample = false,
  search = "",
  onSearchChange,
}) => {
  const term = search.trim().toLowerCase();
  const filtered = term
    ? suppliers.filter((s) =>
        SUPPLIER_SEARCH_FIELDS.some((f) =>
          String(s?.[f] ?? "")
            .toLowerCase()
            .includes(term),
        ),
      )
    : suppliers;

  if (loading) {
    return <Loader message="Loading category suppliers…" />;
  }
  if (!suppliers.length) {
    return (
      <p className="text-muted-foreground">
        No suppliers are linked to
        {categoryName ? ` "${categoryName}"` : " this category"}.
      </p>
    );
  }
  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="px-1 text-sm text-muted-foreground">
          {filtered.length} of {suppliers.length}
        </span>
      </div>
      {isSample && (
        <div className="flex items-center gap-2 border-b border-border bg-warning/5 px-3 py-2 text-sm text-muted-foreground">
          <Badge variant="warning" className="px-2 py-0.5 text-[0.68rem]">
            Sample data
          </Badge>
          <span>
            No suppliers linked to this category yet — showing example rows for
            preview.
          </span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Phone 1</TableHead>
            <TableHead>Phone 2</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Other contact</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>GST</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Remark</TableHead>
            <TableHead>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={13}
                className="py-6 text-center text-muted-foreground"
              >
                No suppliers match “{search}”.
              </TableCell>
            </TableRow>
          ) : null}
          {filtered.map((s, index) => {
            const isDummy = isDummySupplierId(s._id);
            return (
              <TableRow
                key={s._id}
                className={isDummy ? undefined : "cursor-pointer"}
                onClick={
                  isDummy ? undefined : () => navigate(`/suppliers/${s._id}`)
                }
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <strong>{dash(s.name)}</strong>
                </TableCell>
                <TableCell>{dash(s.shopname)}</TableCell>
                <TableCell>{dash(s.phone_1)}</TableCell>
                <TableCell>{dash(s.phone_2)}</TableCell>
                <TableCell>{dash(s.email)}</TableCell>
                <TableCell>{dash(s.other_contact)}</TableCell>
                <TableCell>{dash(s.label)}</TableCell>
                <TableCell>{dash(s.shop_location)}</TableCell>
                <TableCell>{dash(s.gst)}</TableCell>
                <TableCell className="max-w-[14rem] break-words">
                  {dash(s.address)}
                </TableCell>
                <TableCell className="max-w-[12rem] break-words">
                  {dash(s.remark)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={isDummy ? "Sample supplier" : "View supplier"}
                    disabled={isDummy}
                    onClick={
                      isDummy
                        ? undefined
                        : () => navigate(`/suppliers/${s._id}`)
                    }
                  >
                    <EyeIcon />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CategorySuppliersTable;
