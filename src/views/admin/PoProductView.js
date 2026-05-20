import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormText,
  CFormTextarea,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilSave, cilCheckCircle } from "@coreui/icons";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { useAuth } from "../../context/AuthContext";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import { getAssetsUrl } from "../../api/endpoints";

const isHodRole = (role) => {
  const r = String(role || "").toLowerCase();
  return r === "head_of_department" || r === "hod" || r === "admin" || r === "super_admin";
};

const deliverySubStatusBadge = (s) => {
  switch (s) {
    case "hod_approval_pending":
      return <CBadge color="danger">HOD Approval Pending</CBadge>;
    case "delivery_approved_by_hod":
      return <CBadge color="success">Approved by HOD</CBadge>;
    default:
      return s ? (
        <CBadge color="secondary">{s.replace(/_/g, " ")}</CBadge>
      ) : (
        <CBadge color="light" textColor="dark">—</CBadge>
      );
  }
};

const lineStatusBadge = (s) => {
  if (s === "hod_approval_pending")
    return <CBadge color="danger">HOD Approval Pending</CBadge>;
  const map = {
    pending: "warning",
    purchased: "info",
    inventory_received: "primary",
    ready_for_dispatchment: "primary",
    delivered: "success",
    finance_approved: "success",
    po_closed: "dark",
    payment_request_raised: "info",
    billing_request_rejected: "danger",
  };
  const label = s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
  return <CBadge color={map[s] || "secondary"}>{label}</CBadge>;
};

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const DocumentPreview = ({ doc, title }) => {
  if (!doc || typeof doc !== "object") return null;
  const path = doc.path || doc.url;
  const url = path ? getAssetsUrl(path) : null;
  if (!url) return null;
  const mime = String(doc.mimeType || "");
  const isImg = mime.startsWith("image/");
  const name = doc.originalName || "Open file";
  return (
    <div className="mb-3">
      <CFormLabel className="fw-semibold">{title}</CFormLabel>
      {isImg && (
        <div className="mb-2">
          <img
            src={url}
            alt=""
            className="img-fluid rounded border"
            style={{ maxHeight: 220 }}
          />
        </div>
      )}
      <CButton
        color="link"
        className="p-0 d-block"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        {name}
      </CButton>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="mb-2">
    <span className="fw-semibold text-body-secondary small">{label}:</span>{" "}
    <span>{value || "—"}</span>
  </div>
);

const PoProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userCanApprove = isHodRole(user?.role);
  const isApprovalPending = (doc) =>
    String(doc?.status || "").trim() === "hod_approval_pending";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [doc, setDoc] = useState(null);

  const [form, setForm] = useState({
    remark: "",
    description: "",
    targetRate: "",
    quantity: "",
  });

  const defaultTargetRate = (poRate) => {
    if (poRate == null || poRate === "") return "";
    const val = Number(poRate);
    if (!Number.isFinite(val) || val <= 0) return "";
    return String(Math.round(val * 0.9 * 100) / 100);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => poProductsBucketService.getById(id));
        const data = res?.data?.data || res?.data;
        setDoc(data);
        setForm({
          remark: data?.remark || "",
          targetRate:
            data?.targetRate != null
              ? String(data.targetRate)
              : defaultTargetRate(data?.poRate),
          quantity: data?.quantity != null ? String(data.quantity) : "",
          description: data?.description || "",
        });
      } catch (e) {
        toastError(e?.message || "Failed to load PO product");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        remark: form.remark,
        targetRate: form.targetRate !== "" ? Number(form.targetRate) : null,
        quantity: form.quantity !== "" ? Number(form.quantity) : undefined,
        description: form.description,
      };
      const res = await poProductsBucketService.update(id, payload);
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("PO product updated successfully");
    } catch (e) {
      toastError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await poProductsBucketService.update(id, { status: "pending" });
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("HOD approved — status set to Pending");
    } catch (e) {
      toastError(e?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const hodApproved =
    doc?.status != null && doc.status !== "hod_approval_pending";
  const companyInfo = doc?.companyInfo;
  const lineStatus = doc?.status ?? doc?.inventoryStatus;

  if (loading) return <Loader />;

  return (
    <CRow>
      <CCol xs={12}>
        {/* Top bar */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <CButton color="secondary" variant="ghost" onClick={() => navigate("/po-products")}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>

          <h5 className="mb-0 fw-semibold flex-grow-1 text-truncate">
            {doc?.productName || "PO Product"}
          </h5>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {lineStatusBadge(lineStatus)}

            {hodApproved && (
              <CBadge color="success" className="px-2 py-1">
                <CIcon icon={cilCheckCircle} className="me-1" style={{ width: 12 }} />
                HOD Approved
              </CBadge>
            )}

            {userCanApprove && isApprovalPending(doc) && (
              <CButton
                color="success"
                size="sm"
                disabled={approving}
                onClick={handleApprove}
                className="px-3"
              >
                {approving ? (
                  <><CSpinner size="sm" className="me-2" />Approving…</>
                ) : (
                  <><CIcon icon={cilCheckCircle} className="me-1" />HOD Approve</>
                )}
              </CButton>
            )}
          </div>
        </div>

        {/* Approved banner */}
        {hodApproved && (
          <div className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2">
            <CIcon icon={cilCheckCircle} />
            <span>
              This delivery has been <strong>approved by HOD</strong>.
            </span>
          </div>
        )}

        <CRow className="g-4">
          {/* Left: PO info + documents */}
          <CCol xs={12} lg={4}>
            <CCard className="mb-4">
              <CCardHeader><strong>PO &amp; Line Info</strong></CCardHeader>
              <CCardBody>
                <InfoRow label="PO Code" value={
                  <span className="badge bg-dark font-monospace">{doc?.poCode || "—"}</span>
                } />
                <InfoRow label="Raw Product Code" value={
                  doc?.rawProductCode ? <code>{doc.rawProductCode}</code> : "—"
                } />
                <InfoRow label="Quantity" value={`${doc?.quantity ?? "—"} ${doc?.unit || ""}`} />
                <InfoRow label="Dispatch Date" value={formatDateDdMmYyyy(doc?.dispatchmentDate)} />
                <InfoRow label="PO Rate" value={doc?.poRate != null ? `₹${doc.poRate}` : "—"} />
                <InfoRow
                  label="Target Rate"
                  value={doc?.targetRate != null ? `₹${doc.targetRate}` : "—"}
                />
                {doc?.receivingRemark && (
                  <InfoRow label="Receiving Remark" value={doc.receivingRemark} />
                )}
              </CCardBody>
            </CCard>

            {companyInfo && (
              <CCard className="mb-4">
                <CCardHeader><strong>Company</strong></CCardHeader>
                <CCardBody>
                  <InfoRow label="Name" value={companyInfo.name} />
                  <InfoRow
                    label="Area / Location"
                    value={[companyInfo.area, companyInfo.location].filter(Boolean).join(", ")}
                  />
                  <InfoRow label="Address" value={companyInfo.address} />
                  {Array.isArray(companyInfo.purchaseManagers) &&
                    companyInfo.purchaseManagers.length > 0 && (
                      <div className="mt-2">
                        <div className="fw-semibold text-body-secondary small mb-1">
                          Purchase Managers:
                        </div>
                        <ul className="ps-3 mb-0 small">
                          {companyInfo.purchaseManagers.map((pm, i) => (
                            <li key={i}>
                              {[pm.name, pm.phone, pm.email].filter(Boolean).join(" · ") || "—"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </CCardBody>
              </CCard>
            )}

            {/* Documents */}
            {(doc?.attachmentDocumentId || doc?.receivingDocumentId) && (
              <CCard>
                <CCardHeader><strong>Documents</strong></CCardHeader>
                <CCardBody>
                  <DocumentPreview
                    doc={doc.attachmentDocumentId}
                    title="Line attachment"
                  />
                  <DocumentPreview
                    doc={doc.receivingDocumentId}
                    title="Receiving / delivery proof"
                  />
                </CCardBody>
              </CCard>
            )}
          </CCol>

          {/* Right: Data enrichment form */}
          <CCol xs={12} lg={8}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Data Enrichment</strong>
                <span className="small text-body-secondary">
                  Product:{" "}
                  <span className="fw-medium">{doc?.productName || "—"}</span>
                </span>
              </CCardHeader>

              <CCardBody>
                <CRow className="g-3">
                  {/* Read-only fields */}
                  <CCol xs={6} md={4}>
                    <CFormLabel className="text-body-secondary">Product Name</CFormLabel>
                    <CFormInput value={doc?.productName || "—"} readOnly className="bg-light" />
                  </CCol>

                  <CCol xs={6} md={4}>
                    <CFormLabel className="text-body-secondary">Raw Product Code</CFormLabel>
                    <CFormInput
                      value={doc?.rawProductCode || "—"}
                      readOnly
                      className="bg-light font-monospace"
                    />
                  </CCol>

                  <CCol xs={6} md={4}>
                    <CFormLabel className="text-body-secondary">HSN Number</CFormLabel>
                    <CFormInput value={doc?.hsnNumber || "—"} readOnly className="bg-light" />
                  </CCol>

                  <CCol xs={6} md={4}>
                    <CFormLabel className="text-body-secondary">Model Number</CFormLabel>
                    <CFormInput value={doc?.modelNumber || "—"} readOnly className="bg-light" />
                  </CCol>

                  <CCol xs={6} md={2}>
                    <CFormLabel className="text-body-secondary">GST %</CFormLabel>
                    <CFormInput
                      value={doc?.gstPercentage ?? "—"}
                      readOnly
                      className="bg-light"
                    />
                  </CCol>

                  <CCol xs={6} md={2}>
                    <CFormLabel className="text-body-secondary">PO Rate (₹)</CFormLabel>
                    <CFormInput
                      value={doc?.poRate != null ? doc.poRate : "—"}
                      readOnly
                      className="bg-light"
                    />
                  </CCol>

                  <hr className="my-1" />

                  {/* Editable fields */}
                  <CCol xs={6} md={3}>
                    <CFormLabel>Quantity</CFormLabel>
                    <CFormInput
                      type="number"
                      min={0}
                      step="any"
                      value={form.quantity}
                      onChange={(e) => setField("quantity", e.target.value)}
                      placeholder="0"
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Unit</CFormLabel>
                    <CFormInput value={doc?.unit || "—"} readOnly className="bg-light" />
                  </CCol>

                  <CCol xs={12} md={6}>
                    <CFormLabel>
                      Target Rate (₹) <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      type="number"
                      min={0}
                      step="any"
                      value={form.targetRate}
                      onChange={(e) => setField("targetRate", e.target.value)}
                      placeholder="Enter target rate"
                    />
                    {doc?.poRate != null && (
                      <CFormText className="text-body-secondary">
                        PO Rate: ₹{doc.poRate} · Suggested (−10%): ₹
                        {Math.round(doc.poRate * 0.9 * 100) / 100}
                      </CFormText>
                    )}
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Description</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      placeholder="Product description…"
                    />
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Remark</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.remark}
                      onChange={(e) => setField("remark", e.target.value)}
                      placeholder="Any remarks…"
                    />
                  </CCol>
                </CRow>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate("/po-products")}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>
                  <CButton color="primary" onClick={handleUpdate} disabled={saving}>
                    {saving ? (
                      <><CSpinner size="sm" className="me-2" />Updating…</>
                    ) : (
                      <><CIcon icon={cilSave} className="me-2" />Update</>
                    )}
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCol>
    </CRow>
  );
};

export default PoProductView;
