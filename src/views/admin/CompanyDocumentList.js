import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, Upload } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import companyDocumentService from "../../services/companyDocumentService";
import groupService from "../../services/groupService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  Loader,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { buildCatalogSections } from "../../utils/companyCatalogUtils";
import { toastSuccess, toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const DOC_TYPE_OPTIONS = ["Policy", "Certificate", "Other"];
const COMPANY_DOCUMENT_FILTER_DEFAULTS = { docType: "" };

const getId = (row) => row?._id || row?.id;

const getFileName = (row) =>
  row?.documentId?.originalName || row?.documentId?.path || "-";

const CompanyDocumentList = () => {
  const fileInputRef = useRef(null);
  const catalogFileInputRef = useRef(null);
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "company_document_list",
    COMPANY_DOCUMENT_FILTER_DEFAULTS,
  );
  const [documents, setDocuments] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState(initialValues.docType);
  const [pagination, setPagination] = useState({});
  const [uploadModal, setUploadModal] = useState(false);
  const [catalogUploadModal, setCatalogUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    doc_type: "Policy",
    remark: "",
    file: null,
  });
  const [catalogForm, setCatalogForm] = useState({
    name: "",
    remark: "",
    groupId: "",
    file: null,
  });
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        companyDocumentService.list({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm || undefined,
          doc_type: docTypeFilter || undefined,
          exclude_doc_type: docTypeFilter ? undefined : "Catalog",
        }),
      );
      const data = res?.data?.data || res?.data || res;
      setDocuments(data?.companyDocuments || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to load company documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, docTypeFilter]);

  const fetchCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        companyDocumentService.list({
          pageNumber: 1,
          pageSize: 100,
          doc_type: "Catalog",
        }),
      );
      const data = res?.data?.data || res?.data || res;
      setCatalogs(data?.companyDocuments || []);
    } catch (err) {
      setError(err?.message || "Failed to load catalog information");
      setCatalogs([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupService.getAll({ pageNumber: 1, pageSize: 100 });
      const data = res?.data || res;
      setGroups(data?.groups || []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  useFilterLockPersist("company_document_list", filtersLocked, {
    docType: docTypeFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ docType: docTypeFilter });
  };

  useEffect(() => {
    fetchCatalogs();
    fetchGroups();
  }, [fetchCatalogs, fetchGroups]);

  const catalogSections = React.useMemo(
    () => buildCatalogSections(catalogs, groups),
    [catalogs, groups],
  );

  const resetForm = () => {
    setForm({ name: "", doc_type: "Policy", remark: "", file: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetCatalogForm = () => {
    setCatalogForm({ name: "", remark: "", groupId: "", file: null });
    if (catalogFileInputRef.current) catalogFileInputRef.current.value = "";
  };

  const openUploadModal = () => {
    resetForm();
    setUploadModal(true);
  };

  const openCatalogUploadModal = () => {
    resetCatalogForm();
    setCatalogUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  const handleCatalogFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCatalogForm((prev) => ({ ...prev, file }));
  };

  const handleUpload = async () => {
    const name = (form.name || "").trim();
    const doc_type = (form.doc_type || "").trim();
    const remark = (form.remark || "").trim();
    if (!name) {
      toastError("Name is required");
      return;
    }
    if (!doc_type) {
      toastError("Document type is required");
      return;
    }
    if (!form.file) {
      toastError("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      await companyDocumentService.create({
        name,
        doc_type,
        remark,
        file: form.file,
      });
      toastSuccess("Company document uploaded");
      setUploadModal(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload document",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCatalogUpload = async () => {
    const name = (catalogForm.name || "").trim();
    const remark = (catalogForm.remark || "").trim();
    if (!name) {
      toastError("Catalog name is required");
      return;
    }
    if (!catalogForm.file) {
      toastError("Please select a catalog file to upload");
      return;
    }

    setCatalogUploading(true);
    try {
      await companyDocumentService.create({
        name,
        doc_type: "Catalog",
        remark,
        groupId: catalogForm.groupId || undefined,
        file: catalogForm.file,
      });
      toastSuccess("Catalog uploaded");
      setCatalogUploadModal(false);
      resetCatalogForm();
      fetchCatalogs();
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload catalog",
      );
    } finally {
      setCatalogUploading(false);
    }
  };

  const openDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this document");
      return;
    }
    setOpeningDocId(String(docId));
    try {
      const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
        responseType: "blob",
      });
      const blob = response.data ?? response;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toastError("Could not open document");
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await companyDocumentService.delete(id);
      toastSuccess("Company document deleted");
      fetchDocuments();
      fetchCatalogs();
    } catch (err) {
      toastError(err?.message || "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S No",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        exportValue: (doc) => doc.name || "-",
        render: (doc) => <strong>{doc.name || "-"}</strong>,
      },
      {
        key: "doc_type",
        label: "Doc type",
        sortable: true,
        exportValue: (doc) => doc.doc_type || "-",
        render: (doc) => doc.doc_type || "-",
      },
      {
        key: "remark",
        label: "Remark",
        exportValue: (doc) => doc.remark || "-",
        render: (doc) => doc.remark || "-",
      },
      {
        key: "file",
        label: "File",
        exportValue: (doc) => getFileName(doc),
        render: (doc) => {
          const docFileId = doc?.documentId?._id || doc?.documentId;
          return (
            <Button
              variant="link"
              className="h-auto p-0"
              disabled={!docFileId || openingDocId === String(docFileId)}
              onClick={() => openDocument(doc)}
            >
              {getFileName(doc)}
            </Button>
          );
        },
      },
      {
        key: "uploaded",
        label: "Uploaded",
        sortValue: (doc) =>
          doc.createdAt ? new Date(doc.createdAt).getTime() : 0,
        exportValue: (doc) => dateTimeFormatter(doc.createdAt, "-"),
        render: (doc) => dateTimeFormatter(doc.createdAt, "-"),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (doc) => (
          <RowActions
            onDelete={() => setConfirmDelete({ visible: true, id: getId(doc) })}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, openingDocId],
  );

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Company documents"
          description="Upload and manage company policies, certificates, and other documents."
          actions={
            <Button onClick={openUploadModal}>
              <Plus className="h-4 w-4" />
              Upload document
            </Button>
          }
        />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-sm">
            <Filtered
              searchTerm={searchTerm}
              setSearchTerm={(value) => {
                setSearchTerm(value);
                setPage(1);
              }}
              placeholder="Search by name or remark..."
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={docTypeFilter}
              onChange={(e) => {
                setDocTypeFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Document type filter"
            >
              <option value="">All types</option>
              {DOC_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Company Documents"
          />
        </div>

        <DataTable
          columns={columns}
          rows={documents}
          rowKey={(doc) => getId(doc)}
          loading={loading}
          showSearch={false}
          exportFileName="company-documents"
          emptyTitle="No company documents found"
          emptyMessage="Upload a policy or other document to get started."
        />

        <TablePagination
          currentPage={pagination?.currentPage ?? 1}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          showRange
          totalItems={pagination?.totalItems ?? 0}
          itemsPerPage={pagination?.itemsPerPage ?? 10}
        />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Catalog information
          </h2>
          <Button onClick={openCatalogUploadModal}>
            <Plus className="h-4 w-4" />
            Upload catalog
          </Button>
        </div>

        {catalogLoading ? (
          <Loader message="Loading catalog information..." />
        ) : (
          <div className="space-y-4">
            {catalogSections.map((section) => (
              <Card key={section.key}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.catalogs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No catalog uploaded for this group yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-16">S No</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Remark</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.catalogs.map((catalog, index) => {
                            const docFileId =
                              catalog?.documentId?._id || catalog?.documentId;
                            return (
                              <TableRow key={getId(catalog)}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <strong>{catalog.name || "-"}</strong>
                                </TableCell>
                                <TableCell>{catalog.remark || "-"}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="link"
                                    className="h-auto p-0"
                                    disabled={
                                      !docFileId ||
                                      openingDocId === String(docFileId)
                                    }
                                    onClick={() => openDocument(catalog)}
                                  >
                                    {getFileName(catalog)}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  {dateTimeFormatter(catalog.createdAt, "-")}
                                </TableCell>
                                <TableCell className="text-right">
                                  <RowActions
                                    onDelete={() =>
                                      setConfirmDelete({
                                        visible: true,
                                        id: getId(catalog),
                                      })
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={uploadModal}
        onOpenChange={(open) => !open && setUploadModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload company document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-doc-name">Name</Label>
              <Input
                id="company-doc-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Document name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-doc-type">Doc type</Label>
              <Select
                id="company-doc-type"
                value={form.doc_type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, doc_type: e.target.value }))
                }
              >
                {DOC_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-doc-remark">Remark</Label>
              <Textarea
                id="company-doc-remark"
                rows={3}
                value={form.remark}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remark: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-doc-file">File</Label>
              <Input
                id="company-doc-file"
                type="file"
                accept=".pdf,.xls,.xlsx,image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                PDF, Excel, or image files up to 15MB
              </p>
            </div>
            {form.file && (
              <div className="text-sm text-muted-foreground">
                Selected: {form.file.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadModal(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={catalogUploadModal}
        onOpenChange={(open) => !open && setCatalogUploadModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload catalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="catalog-name">Name</Label>
              <Input
                id="catalog-name"
                value={catalogForm.name}
                onChange={(e) =>
                  setCatalogForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Catalog name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalog-group">Catalog group</Label>
              <Select
                id="catalog-group"
                value={catalogForm.groupId}
                onChange={(e) =>
                  setCatalogForm((prev) => ({
                    ...prev,
                    groupId: e.target.value,
                  }))
                }
              >
                <option value="">Main catalog</option>
                {groups.map((group) => (
                  <option key={getId(group)} value={getId(group)}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalog-remark">Remark</Label>
              <Textarea
                id="catalog-remark"
                rows={3}
                value={catalogForm.remark}
                onChange={(e) =>
                  setCatalogForm((prev) => ({
                    ...prev,
                    remark: e.target.value,
                  }))
                }
                placeholder="Optional notes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalog-file">File</Label>
              <Input
                id="catalog-file"
                type="file"
                accept=".pdf,.xls,.xlsx,image/*"
                ref={catalogFileInputRef}
                onChange={handleCatalogFileChange}
              />
              <p className="text-sm text-muted-foreground">
                PDF, Excel, or image files up to 15MB
              </p>
            </div>
            {catalogForm.file && (
              <div className="text-sm text-muted-foreground">
                Selected: {catalogForm.file.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCatalogUploadModal(false)}
              disabled={catalogUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleCatalogUpload} disabled={catalogUploading}>
              <Upload className="h-4 w-4" />
              {catalogUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete company document?"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CompanyDocumentList;
