import React, { useEffect, useRef, useState } from "react";
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
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilSave, cilCheckCircle, cilTrash, cilCloudUpload } from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import documentService from "../../services/documentService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import { useAuth } from "../../context/AuthContext";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { sortAlphabetically } from "../../utils/sort";
import { Loader } from "../../components";

/* ── helpers ─────────────────────────────────────── */
const isHodRole = (role) => {
  const r = String(role || "").toLowerCase();
  return r === "head_of_department" || r === "hod";
};

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img.signedUrl) return img.signedUrl;
  if (img.url) return img.url;
  if (img.path) return img.path;
  return null;
};

const statusBadge = (s) => {
  switch (s) {
    case "pending":          return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":   return <CBadge color="info">Rate Submitted</CBadge>;
    case "fulfilled":        return <CBadge color="success">Fulfilled</CBadge>;
    case "approval_pending": return <CBadge color="danger">HOD Pending</CBadge>;
    default:                 return <CBadge color="light" textColor="dark">{s || "—"}</CBadge>;
  }
};

/* ── component ───────────────────────────────────── */
const QueryProductView = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const { user }     = useAuth();

  const userIsHod = isHodRole(user?.role);

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(false);
  const [doc,       setDoc]       = useState(null);

  const [groups,        setGroups]        = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [pendingFiles,    setPendingFiles]    = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const [form, setForm] = useState({
    productName:    "",
    rawProductCode: "",
    quantity:       "",
    unit:           "",
    hsnNumber:      "",
    modelNumber:    "",
    gstPercentage:  "",
    description:    "",
    remark:         "",
    groupId:        "",
    categoryId:     "",
  });

  /* categories filtered by selected group — must be after form useState */
  const filteredCategories = form.groupId
    ? allCategories.filter((c) => {
        const gId = c.group && typeof c.group === "object"
          ? c.group._id || c.group.id
          : c.group;
        return String(gId || "") === String(form.groupId);
      })
    : allCategories;

  /* ── load groups / categories ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [grpRes, catRes] = await Promise.all([
          groupService.getAll({ pageSize: 100 }),
          categoryService.getAll({ pageSize: 100 }),
        ]);
        setGroups(sortAlphabetically(
          Array.isArray(grpRes?.data?.groups)   ? grpRes.data.groups
          : Array.isArray(grpRes?.data)          ? grpRes.data : [],
        ));
        setAllCategories(sortAlphabetically(
          Array.isArray(catRes?.data?.categories) ? catRes.data.categories
          : Array.isArray(catRes?.data)            ? catRes.data : [],
        ));
      } catch { /* non-critical */ }
    };
    loadMeta();
  }, []);

  /* ── load document ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await withMinimumDelay(() => proBucketService.getById(id));
        const data = res?.data?.data || res?.data;
        setDoc(data);
        setForm({
          productName:    data?.productName    || "",
          rawProductCode: data?.rawProductCode || "",
          quantity:       data?.quantity ?? "",
          unit:           data?.unit           || "",
          hsnNumber:      data?.hsnNumber      || "",
          modelNumber:    data?.modelNumber    || "",
          gstPercentage:  data?.gstPercentage ?? "",
          description:    data?.description   || "",
          remark:         data?.remark        || "",
          groupId:
            data?.groupId && typeof data.groupId === "object"
              ? data.groupId._id || "" : data?.groupId || "",
          categoryId:
            data?.categoryId && typeof data.categoryId === "object"
              ? data.categoryId._id || "" : data?.categoryId || "",
        });
      } catch (e) {
        toastError(e?.message || "Failed to load query product");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  /* cleanup object URLs */
  useEffect(() => {
    return () => pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingPreviews]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── image helpers ── */
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles((p)    => [...p, ...files]);
    setPendingPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removePending = (idx) => {
    URL.revokeObjectURL(pendingPreviews[idx]);
    setPendingFiles((p)    => p.filter((_, i) => i !== idx));
    setPendingPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const removeSaved = (imgId) => {
    setDoc((prev) => ({
      ...prev,
      images: (prev?.images || []).filter(
        (img) => (img?._id || img) !== imgId,
      ),
    }));
  };

  const buildImageIds = (uploadedDocs) => {
    const saved = (doc?.images || [])
      .map((img) => (typeof img === "object" ? img._id || img.id : img))
      .filter(Boolean);
    const fresh = uploadedDocs.map((d) => d._id || d.id).filter(Boolean);
    return [...saved, ...fresh];
  };

  /* ── update ── */
  const handleUpdate = async () => {
    setSaving(true);
    try {
      let uploadedDocs = [];
      if (pendingFiles.length > 0) {
        const res = await documentService.uploadImages(pendingFiles);
        const raw = res?.data || res;
        uploadedDocs = raw?.data?.documents || raw?.documents || [];
      }

      const payload = {
        productName:    form.productName,
        rawProductCode: form.rawProductCode,
        quantity:       form.quantity !== "" ? Number(form.quantity) : undefined,
        unit:           form.unit,
        hsnNumber:      form.hsnNumber,
        modelNumber:    form.modelNumber,
        gstPercentage:  form.gstPercentage !== "" ? Number(form.gstPercentage) : null,
        description:    form.description,
        remark:         form.remark,
        groupId:        form.groupId    || null,
        categoryId:     form.categoryId || null,
        images:         buildImageIds(uploadedDocs),
      };

      const res     = await proBucketService.updateQueryProduct(id, payload);
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);

      setPendingFiles([]);
      setPendingPreviews([]);
      toastSuccess("Query product updated successfully");
    } catch (e) {
      toastError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  /* ── HOD approve ── */
  const handleApprove = async () => {
    setApproving(true);
    try {
      const res     = await proBucketService.updateQueryProduct(id, {
        status:      "pending",
        hodApproved: true,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("HOD approved — status set to Pending");
    } catch (e) {
      toastError(e?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  /* ── derived flags ── */
  const hodApproved   = !!doc?.hodApproved;
  const canUpdate     = userIsHod || !hodApproved;   // non-HOD locked out after approval
  const savedImages   = Array.isArray(doc?.images) ? doc.images : [];
  const queryCode     =
    doc?.queryCode ||
    (doc?.queryId && typeof doc.queryId === "object" ? doc.queryId.queryCode : "") ||
    "—";

  if (loading) return <Loader />;

  return (
    <CRow>
      <CCol xs={12}>

        {/* ── Top bar ── */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <CButton color="secondary" variant="ghost" onClick={() => navigate("/query-products")}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>

          <h5 className="mb-0 fw-semibold flex-grow-1 text-truncate">
            {doc?.productName || "Query Product"}
          </h5>

          <div className="d-flex align-items-center gap-2">
            {statusBadge(doc?.status)}

            {hodApproved && (
              <CBadge color="success" className="px-2 py-1">
                <CIcon icon={cilCheckCircle} className="me-1" style={{ width: 12 }} />
                HOD Approved
              </CBadge>
            )}

            {/* HOD Approve — visible to HOD only, disabled after approval */}
            {userIsHod && (
              <CButton
                color="success"
                size="sm"
                disabled={hodApproved || approving}
                onClick={handleApprove}
                className="px-3"
              >
                {approving ? (
                  <><CSpinner size="sm" className="me-2" />Approving…</>
                ) : hodApproved ? (
                  <><CIcon icon={cilCheckCircle} className="me-1" />HOD Approved</>
                ) : (
                  <><CIcon icon={cilCheckCircle} className="me-1" />HOD Approve</>
                )}
              </CButton>
            )}
          </div>
        </div>

        {/* locked banner for non-HOD after approval */}
        {hodApproved && !userIsHod && (
          <div className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2">
            <CIcon icon={cilCheckCircle} />
            <span>
              This product has been <strong>HOD approved</strong>. Editing is restricted to Head of Department only.
            </span>
          </div>
        )}

        <CRow className="g-4">

          {/* ── Images panel ── */}
          <CCol xs={12} lg={4}>
            <CCard className="h-100">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Images</strong>
                <CBadge color="secondary">
                  {savedImages.length + pendingFiles.length}
                </CBadge>
              </CCardHeader>
              <CCardBody>

                {savedImages.length > 0 && (
                  <div className="mb-3">
                    <p className="small text-body-secondary mb-2">Saved</p>
                    <div className="d-flex flex-wrap gap-2">
                      {savedImages.map((img, i) => {
                        const url   = resolveUrl(img);
                        const imgId = typeof img === "object" ? img._id || img.id : img;
                        const name  = typeof img === "object" ? img.name || `Image ${i + 1}` : `Image ${i + 1}`;
                        return (
                          <div
                            key={i}
                            className="position-relative border rounded overflow-hidden"
                            style={{ width: 100, flexShrink: 0 }}
                          >
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url} alt={name}
                                  style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              </a>
                            ) : (
                              <div className="d-flex align-items-center justify-content-center bg-light text-body-secondary small" style={{ height: 90 }}>
                                No preview
                              </div>
                            )}
                            <div className="px-1 py-1 small text-truncate border-top bg-white" style={{ fontSize: "0.65rem" }} title={name}>
                              {name}
                            </div>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => removeSaved(imgId)}
                                title="Remove"
                                style={{
                                  position: "absolute", top: 3, right: 3,
                                  background: "rgba(220,53,69,0.85)", border: "none",
                                  borderRadius: "50%", width: 20, height: 20,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer", padding: 0, color: "#fff",
                                }}
                              >
                                <CIcon icon={cilTrash} style={{ width: 10, height: 10 }} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pendingFiles.length > 0 && (
                  <div className="mb-3">
                    <p className="small text-body-secondary mb-2">
                      Pending upload ({pendingFiles.length})
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {pendingPreviews.map((src, i) => (
                        <div key={i} className="position-relative border rounded overflow-hidden" style={{ width: 100, flexShrink: 0 }}>
                          <img src={src} alt={pendingFiles[i]?.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                          <div className="px-1 py-1 small text-truncate border-top bg-white" style={{ fontSize: "0.65rem" }} title={pendingFiles[i]?.name}>
                            {pendingFiles[i]?.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => removePending(i)}
                            title="Remove"
                            style={{
                              position: "absolute", top: 3, right: 3,
                              background: "rgba(220,53,69,0.85)", border: "none",
                              borderRadius: "50%", width: 20, height: 20,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", padding: 0, color: "#fff",
                            }}
                          >
                            <CIcon icon={cilTrash} style={{ width: 10, height: 10 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canUpdate && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFilePick}
                    />
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      className="w-100"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      Add Images
                    </CButton>
                    {pendingFiles.length > 0 && (
                      <p className="small text-warning mt-2 mb-0">
                        ⚠ {pendingFiles.length} image{pendingFiles.length !== 1 ? "s" : ""} waiting — click <strong>Update</strong> to save.
                      </p>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          {/* ── Details / edit form ── */}
          <CCol xs={12} lg={8}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Product Details</strong>
                <span className="small text-body-secondary">
                  Query: <span className="badge bg-dark font-monospace">{queryCode}</span>
                </span>
              </CCardHeader>

              <CCardBody>
                <CRow className="g-3">

                  <CCol xs={12} md={6}>
                    <CFormLabel>Product Name <span className="text-danger">*</span></CFormLabel>
                    <CFormInput
                      value={form.productName}
                      onChange={(e) => setField("productName", e.target.value)}
                      placeholder="Product name"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={12} md={6}>
                    <CFormLabel>Raw Product Code</CFormLabel>
                    <CFormInput
                      value={form.rawProductCode}
                      onChange={(e) => setField("rawProductCode", e.target.value)}
                      placeholder="Raw product code"
                      className="font-monospace"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={12} md={6}>
                    <CFormLabel>Query Code</CFormLabel>
                    <CFormInput value={queryCode} readOnly className="bg-light font-monospace" />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Unit</CFormLabel>
                    <CFormInput
                      value={form.unit}
                      onChange={(e) => setField("unit", e.target.value)}
                      placeholder="e.g. pcs"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Quantity</CFormLabel>
                    <CFormInput
                      type="number" min={0}
                      value={form.quantity}
                      onChange={(e) => setField("quantity", e.target.value)}
                      placeholder="0"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>HSN Number</CFormLabel>
                    <CFormInput
                      value={form.hsnNumber}
                      onChange={(e) => setField("hsnNumber", e.target.value)}
                      placeholder="HSN code"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Model Number</CFormLabel>
                    <CFormInput
                      value={form.modelNumber}
                      onChange={(e) => setField("modelNumber", e.target.value)}
                      placeholder="Model no."
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>GST %</CFormLabel>
                    <CFormInput
                      type="number" min={0} max={100}
                      value={form.gstPercentage}
                      onChange={(e) => setField("gstPercentage", e.target.value)}
                      placeholder="0"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={12} md={4}>
                    <CFormLabel>Group</CFormLabel>
                    <CFormSelect
                      value={form.groupId}
                      onChange={(e) => {
                        const newGroupId = e.target.value;
                        /* clear category if it doesn't belong to the new group */
                        const catStillValid = allCategories.some((c) => {
                          if ((c._id || c.id) !== form.categoryId) return false;
                          if (!newGroupId) return true;
                          const gId = c.group && typeof c.group === "object"
                            ? c.group._id || c.group.id : c.group;
                          return String(gId || "") === String(newGroupId);
                        });
                        setForm((f) => ({
                          ...f,
                          groupId: newGroupId,
                          categoryId: catStillValid ? f.categoryId : "",
                        }));
                      }}
                      disabled={!canUpdate}
                    >
                      <option value="">— No Group —</option>
                      {groups.map((g) => (
                        <option key={g._id || g.id} value={g._id || g.id}>{g.name}</option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={5}>
                    <CFormLabel>
                      Category
                      {form.groupId && (
                        <span className="ms-1 small text-body-secondary">
                          ({filteredCategories.length} in group)
                        </span>
                      )}
                    </CFormLabel>
                    <CFormSelect
                      value={form.categoryId}
                      onChange={(e) => setField("categoryId", e.target.value)}
                      disabled={!canUpdate}
                    >
                      <option value="">— No Category —</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Description</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      placeholder="Product description…"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Remark</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.remark}
                      onChange={(e) => setField("remark", e.target.value)}
                      placeholder="Any remarks…"
                      disabled={!canUpdate}
                    />
                  </CCol>
                </CRow>

                {/* ── Action row ── */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate("/query-products")}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>

                  {canUpdate && (
                    <CButton color="primary" onClick={handleUpdate} disabled={saving}>
                      {saving ? (
                        <><CSpinner size="sm" className="me-2" />Updating…</>
                      ) : (
                        <><CIcon icon={cilSave} className="me-2" />Update</>
                      )}
                    </CButton>
                  )}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCol>
    </CRow>
  );
};

export default QueryProductView;
