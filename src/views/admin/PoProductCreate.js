import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { cilArrowLeft, cilSave } from "@coreui/icons";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { toastError, toastSuccess } from "../../utils/toast";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const defaultTargetRate = (poRate) => {
  const val = Number(poRate);
  if (!Number.isFinite(val) || val <= 0) return "";
  return String(Math.round(val * 0.9 * 100) / 100);
};

const PoProductCreate = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const product = state?.product;
  const { formatArea } = useAreaNameLookup();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    quantity: "",
    targetRate: "",
    remark: "",
  });

  useEffect(() => {
    if (!product) {
      navigate("/po-products/add", { replace: true });
      return;
    }
    setForm({
      quantity: product.quantity != null ? String(product.quantity) : "",
      targetRate:
        product.poRate != null ? defaultTargetRate(product.poRate) : "",
      remark: product.remark || "",
    });
  }, [product]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.quantity || Number(form.quantity) < 0) {
      toastError("Quantity is required and must be ≥ 0");
      return;
    }
    setSaving(true);
    try {
      await poProductsBucketService.create({
        purchaseOrderId: product.purchaseOrderId,
        poCode: product.poCode || "",
        productName: product.productName,
        unit: product.unit || "",
        rawProductCode: product.rawProductCode || "",
        hsnNumber: product.hsnNumber || "",
        modelNumber: product.modelNumber || "",
        gstPercentage: product.gstPercentage ?? null,
        description: product.description || "",
        companyInfo: product.companyInfo || {},
        quantity: Number(form.quantity),
        targetRate: form.targetRate !== "" ? Number(form.targetRate) : null,
        remark: form.remark,
      });
      toastSuccess(
        "Sales Order product created with HOD Approval Pending status",
      );
      navigate("/po-products");
    } catch (e) {
      toastError(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <CRow>
      <CCol xs={12}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => navigate("/po-products/add")}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>
          <h5 className="mb-0 fw-semibold flex-grow-1 text-truncate">
            New Sales Order Product
          </h5>
          <CBadge color="danger" className="px-2 py-1">
            HOD Approval Pending
          </CBadge>
        </div>

        <CCard>
          <CCardHeader>
            <strong>Create Product Entry</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              {/* All info fields — disabled */}
              <CCol xs={12} md={6}>
                <CFormLabel className="text-body-secondary">
                  Product Name
                </CFormLabel>
                <CFormInput
                  value={product.productName || "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={12} md={6}>
                <CFormLabel className="text-body-secondary">
                  Raw Product Code
                </CFormLabel>
                <CFormInput
                  value={product.rawProductCode || "—"}
                  disabled
                  className="bg-light font-monospace"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">
                  Sales Order Code
                </CFormLabel>
                <CFormInput
                  value={product.poCode || "—"}
                  disabled
                  className="bg-light font-monospace"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">Unit</CFormLabel>
                <CFormInput
                  value={product.unit || "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">
                  HSN Number
                </CFormLabel>
                <CFormInput
                  value={product.hsnNumber || "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">
                  Model Number
                </CFormLabel>
                <CFormInput
                  value={product.modelNumber || "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">GST %</CFormLabel>
                <CFormInput
                  value={product.gstPercentage ?? "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel className="text-body-secondary">
                  Sales Order Rate (₹)
                </CFormLabel>
                <CFormInput
                  value={product.poRate != null ? product.poRate : "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={12} md={6}>
                <CFormLabel className="text-body-secondary">Company</CFormLabel>
                <CFormInput
                  value={
                    product.companyInfo?.name
                      ? [
                          product.companyInfo.name,
                          formatArea(product.companyInfo?.area),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"
                  }
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel className="text-body-secondary">
                  Description
                </CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={product.description || "—"}
                  disabled
                  className="bg-light"
                />
              </CCol>

              <CCol xs={12}>
                <hr className="my-1" />
              </CCol>

              {/* Editable fields */}
              <CCol xs={6} md={3}>
                <CFormLabel>
                  Quantity <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  min={0}
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </CCol>

              <CCol xs={6} md={3}>
                <CFormLabel>Target Rate (₹)</CFormLabel>
                <CFormInput
                  type="number"
                  min={0}
                  step="any"
                  value={form.targetRate}
                  onChange={(e) => setField("targetRate", e.target.value)}
                  placeholder="0.00"
                />
                {product.poRate != null && (
                  <CFormText className="text-body-secondary">
                    Suggested (−10%): ₹
                    {Math.round(product.poRate * 0.9 * 100) / 100}
                  </CFormText>
                )}
              </CCol>

              <CCol xs={12}>
                <CFormLabel>Remark</CFormLabel>
                <CFormTextarea
                  rows={3}
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
                onClick={() => navigate("/po-products/add")}
                disabled={saving}
              >
                Cancel
              </CButton>
              <CButton color="primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} className="me-2" />
                    Create Product
                  </>
                )}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default PoProductCreate;
