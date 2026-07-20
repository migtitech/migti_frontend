import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, X } from "lucide-react";
import subZoneService from "../../services/subZoneService";
import {
  Loader,
  ConfirmDialog,
  PageHeader,
  RowActions,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const getId = (row) => row?._id || row?.id;

const SubZoneList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState({
    visible: false,
    subZoneId: "",
    name: "",
  });
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() => subZoneService.listGrouped());
      const data = res?.data?.data || res?.data || res;
      setZones(data?.zones || []);
    } catch (err) {
      setError(err?.message || "Failed to load sub-zones");
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (sz) => {
    setEditModal({ visible: true, subZoneId: getId(sz), name: sz.name || "" });
  };

  const saveEdit = async () => {
    const id = editModal.subZoneId;
    const name = (editModal.name || "").trim();
    if (!id || !name) {
      toastError("Name is required");
      return;
    }
    try {
      await subZoneService.update(id, { name });
      toastSuccess("Sub-zone updated");
      setEditModal({ visible: false, subZoneId: "", name: "" });
      load();
    } catch (err) {
      toastError(err?.message || "Update failed");
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await subZoneService.delete(id);
      toastSuccess("Sub-zone deleted");
      load();
    } catch (err) {
      toastError(err?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="p-5 text-center">
        <Loader message="Loading sub-zones..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sub-zones"
        description="Grouped by zone"
        actions={
          canCreate("sub_zones") && (
            <Button onClick={() => navigate("/sub-zones/new")}>
              <Plus className="h-4 w-4" />
              Add sub-zone
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {zones.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No zones found.</p>
          ) : (
            <div className="divide-y divide-border">
              {zones.map((zone) => {
                const zid = getId(zone);
                const subs = zone.subZones || [];
                const label = `${zone.name || "Zone"}${zone.city ? ` — ${zone.city}` : ""}`;
                return (
                  <details key={String(zid)} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50">
                      <span>
                        {label}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({subs.length} sub-zone
                          {subs.length === 1 ? "" : "s"})
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4">
                      {subs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No sub-zones for this zone.
                        </p>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subs.map((sz) => (
                                <TableRow key={getId(sz)}>
                                  <TableCell className="whitespace-nowrap">
                                    {sz.subZoneCode}
                                  </TableCell>
                                  <TableCell>{sz.name}</TableCell>
                                  <TableCell className="text-right">
                                    <RowActions
                                      onEdit={
                                        canUpdate("sub_zones")
                                          ? () => openEdit(sz)
                                          : undefined
                                      }
                                      onDelete={
                                        canDelete("sub_zones")
                                          ? () =>
                                              setConfirmDelete({
                                                visible: true,
                                                id: getId(sz),
                                              })
                                          : undefined
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editModal.visible}
        onOpenChange={(open) =>
          !open && setEditModal({ visible: false, subZoneId: "", name: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-zone Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={editModal.name}
              onChange={(e) =>
                setEditModal((m) => ({ ...m, name: e.target.value }))
              }
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditModal({ visible: false, subZoneId: "", name: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Delete Sub-zone?"
        message="This will soft-delete the sub-zone. Existing references may still point to it."
        confirmText="Delete"
        confirmColor="danger"
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default SubZoneList;
