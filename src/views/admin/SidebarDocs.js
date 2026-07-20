import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Download, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import companyDocumentService from "../../services/companyDocumentService";
import groupService from "../../services/groupService";
import { Loader, PageHeader } from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { buildCatalogSections } from "../../utils/companyCatalogUtils";
import { toastError } from "../../utils/toast";

const getId = (row) => row?._id || row?.id;

const getFileName = (row) =>
  row?.documentId?.originalName || row?.name || "document";

const SidebarDocs = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionKey, setActionKey] = useState(null);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogRes, groupRes] = await withMinimumDelay(() =>
        Promise.all([
          companyDocumentService.list({
            pageNumber: 1,
            pageSize: 100,
            doc_type: "Catalog",
            search: searchTerm || undefined,
          }),
          groupService.getAll({ pageNumber: 1, pageSize: 100 }),
        ]),
      );
      const catalogData =
        catalogRes?.data?.data || catalogRes?.data || catalogRes;
      const groupData = groupRes?.data?.data || groupRes?.data || groupRes;
      setCatalogs(catalogData?.companyDocuments || []);
      setGroups(groupData?.groups || []);
    } catch (err) {
      setError(err?.message || "Failed to load company catalogs");
      setCatalogs([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCatalogData]);

  const catalogSections = useMemo(
    () => buildCatalogSections(catalogs, groups),
    [catalogs, groups],
  );

  const fetchDocBlob = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this catalog");
      return null;
    }
    const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
      responseType: "blob",
    });
    return response.data ?? response;
  };

  const viewDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this catalog");
      return;
    }
    setActionKey(`view-${docId}`);
    try {
      const blob = await fetchDocBlob(row);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toastError("Could not open catalog");
    } finally {
      setActionKey(null);
    }
  };

  const downloadDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this catalog");
      return;
    }
    setActionKey(`download-${docId}`);
    try {
      const blob = await fetchDocBlob(row);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getFileName(row);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toastError("Could not download catalog");
    } finally {
      setActionKey(null);
    }
  };

  const renderCatalogActions = (catalog) => {
    const docFileId = catalog?.documentId?._id || catalog?.documentId;
    const viewLoading = actionKey === `view-${String(docFileId)}`;
    const downloadLoading = actionKey === `download-${String(docFileId)}`;

    return (
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="View"
          disabled={!docFileId || viewLoading || downloadLoading}
          onClick={() => viewDocument(catalog)}
        >
          {viewLoading ? <Spinner size="sm" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Download"
          disabled={!docFileId || viewLoading || downloadLoading}
          onClick={() => downloadDocument(catalog)}
        >
          {downloadLoading ? (
            <Spinner size="sm" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  const renderCatalogTable = (sectionCatalogs) => (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionCatalogs.map((catalog, index) => (
                <TableRow key={getId(catalog)}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <strong>{catalog.name || "-"}</strong>
                  </TableCell>
                  <TableCell>{catalog.remark || "-"}</TableCell>
                  <TableCell>{renderCatalogActions(catalog)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="md:hidden">
        {sectionCatalogs.map((catalog, index) => (
          <div
            key={getId(catalog)}
            className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-border p-4"
          >
            <div className="flex-grow">
              <div className="mb-1 text-sm text-muted-foreground">
                #{index + 1}
              </div>
              <div className="font-semibold">{catalog.name || "-"}</div>
              <div className="text-sm text-muted-foreground">
                {catalog.remark || "-"}
              </div>
            </div>
            {renderCatalogActions(catalog)}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div>
      <PageHeader title="Company Catalog" />

      <Card>
        <CardContent className="p-6">
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 flex items-start justify-between gap-2"
            >
              <AlertDescription>{error}</AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 h-6 w-6 shrink-0"
                onClick={() => setError("")}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          <div className="mb-4 max-w-md">
            <Input
              type="text"
              placeholder="Search catalog by name or remark…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <Loader message="Loading company catalogs..." />
          ) : catalogSections.length === 0 ? (
            <div className="py-3 text-center text-sm text-muted-foreground">
              No catalogs found.
            </div>
          ) : (
            catalogSections.map((section) => (
              <Card key={section.key} className="mb-3 border">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.catalogs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No catalog uploaded for this group yet.
                    </div>
                  ) : (
                    renderCatalogTable(section.catalogs)
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SidebarDocs;
