import React, { useEffect, useState } from "react";
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilPlus, cilTrash } from "@coreui/icons";
import { useNavigate } from "react-router-dom";
import subZoneService from "../../services/subZoneService";
import { Loader, ConfirmDialog } from "../../components";
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
      <div className="text-center p-5">
        <Loader message="Loading sub-zones..." />
      </div>
    );
  }

  return (
    <>
      <CRow className="mb-3 align-items-center">
        <CCol>
          <h4 className="mb-0">Sub-zones</h4>
          <small className="text-muted">Grouped by zone</small>
        </CCol>
        <CCol xs="auto">
          {canCreate("sub_zones") && (
            <CButton color="primary" onClick={() => navigate("/sub-zones/new")}>
              <CIcon icon={cilPlus} className="me-1" />
              Add sub-zone
            </CButton>
          )}
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError("")}>
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>
          <strong>Zone-wise sub-zones</strong>
        </CCardHeader>
        <CCardBody>
          {zones.length === 0 ? (
            <p className="text-muted mb-0">No zones found for your branch.</p>
          ) : (
            <CAccordion alwaysOpen flush>
              {zones.map((zone) => {
                const zid = getId(zone);
                const subs = zone.subZones || [];
                const label = `${zone.name || "Zone"}${zone.city ? ` — ${zone.city}` : ""}`;
                return (
                  <CAccordionItem itemKey={String(zid)} key={String(zid)}>
                    <CAccordionHeader>
                      {label}
                      <span className="text-muted small ms-2">
                        ({subs.length} sub-zone{subs.length === 1 ? "" : "s"})
                      </span>
                    </CAccordionHeader>
                    <CAccordionBody>
                      {subs.length === 0 ? (
                        <p className="text-muted small mb-0">
                          No sub-zones for this zone.
                        </p>
                      ) : (
                        <CTable
                          responsive
                          hover
                          align="middle"
                          className="mb-0"
                        >
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell scope="col">
                                Code
                              </CTableHeaderCell>
                              <CTableHeaderCell scope="col">
                                Name
                              </CTableHeaderCell>
                              <CTableHeaderCell
                                scope="col"
                                className="text-end"
                              >
                                Actions
                              </CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {subs.map((sz) => (
                              <CTableRow key={getId(sz)}>
                                <CTableDataCell className="text-nowrap">
                                  {sz.subZoneCode}
                                </CTableDataCell>
                                <CTableDataCell>{sz.name}</CTableDataCell>
                                <CTableDataCell className="text-end">
                                  {canUpdate("sub_zones") && (
                                    <CButton
                                      color="primary"
                                      variant="ghost"
                                      size="sm"
                                      className="me-1"
                                      onClick={() => openEdit(sz)}
                                    >
                                      <CIcon icon={cilPencil} />
                                    </CButton>
                                  )}
                                  {canDelete("sub_zones") && (
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setConfirmDelete({
                                          visible: true,
                                          id: getId(sz),
                                        })
                                      }
                                    >
                                      <CIcon icon={cilTrash} />
                                    </CButton>
                                  )}
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      )}
                    </CAccordionBody>
                  </CAccordionItem>
                );
              })}
            </CAccordion>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={editModal.visible}
        onClose={() =>
          setEditModal({ visible: false, subZoneId: "", name: "" })
        }
      >
        <CModalHeader>
          <CModalTitle>Edit sub-zone name</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel>Name</CFormLabel>
          <CFormInput
            value={editModal.name}
            onChange={(e) =>
              setEditModal((m) => ({ ...m, name: e.target.value }))
            }
            maxLength={200}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() =>
              setEditModal({ visible: false, subZoneId: "", name: "" })
            }
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveEdit}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>

      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Delete sub-zone?"
        message="This will soft-delete the sub-zone. Existing references may still point to it."
        confirmText="Delete"
        confirmColor="danger"
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default SubZoneList;
