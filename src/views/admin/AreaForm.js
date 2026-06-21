import React, { useState, useEffect } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CAlert,
  CSpinner,
} from "@coreui/react";
import { useNavigate, useParams } from "react-router-dom";
import areaService from "../../services/areaService";
import companyService from "../../services/companyService";
import branchService from "../../services/branchService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const AreaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    companyId: "",
    branchId: "",
    name: "",
    city: "",
    areaType: "market",
  });

  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getId = (item) => item?.id || item?._id;

  const fetchCompanies = async () => {
    try {
      const res = await companyService.getAll({ pageNumber: 1, pageSize: 100 });
      const data = res?.data?.data || res?.data || res;
      setCompanies(data?.companies || data || []);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchBranchesByCompany = async (companyId) => {
    if (!companyId) {
      setBranches([]);
      return;
    }
    try {
      const res = await branchService.getAll({ companyId, pageSize: 100 });
      const data = res?.data?.data || res?.data || res;
      setBranches(data?.branches || []);
    } catch (err) {
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (formData.companyId) {
      fetchBranchesByCompany(formData.companyId);
    } else {
      setBranches([]);
    }
  }, [formData.companyId]);

  useEffect(() => {
    if (!formData.companyId || branches.length === 0) return;
    const firstBranchId = getId(branches[0]);
    if (
      !formData.branchId ||
      !branches.some((b) => getId(b) === formData.branchId)
    ) {
      setFormData((prev) => ({ ...prev, branchId: firstBranchId }));
    }
  }, [formData.companyId, formData.branchId, branches]);

  useEffect(() => {
    if (!isEdit) return;
    const loadArea = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => areaService.getById(id));
        const area = res?.data?.data || res?.data || res;
        if (!area) {
          setError("Zone not found");
          return;
        }
        const companyId = area.companyId?._id || area.companyId || "";
        setFormData({
          companyId,
          branchId: area.branchId?._id || area.branchId || "",
          name: area.name || "",
          city: area.city || "",
          areaType: area.areaType || "market",
        });
        if (companyId) fetchBranchesByCompany(companyId);
      } catch (err) {
        setError(err?.message || "Failed to load zone");
        toastError(err?.message || "Failed to load zone");
      } finally {
        setLoading(false);
      }
    };
    loadArea();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "companyId") next.branchId = "";
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = {};
    if (!formData.companyId?.trim()) errs.companyId = "Company is required";
    if (!formData.branchId?.trim()) {
      errs.branchId = "No branch available for the selected company";
    }
    const name = (formData.name || "").trim();
    if (!name) errs.name = "Name is required";
    else if (name.length < 2) errs.name = "Name must be at least 2 characters";
    else if (name.length > 100)
      errs.name = "Name must be at most 100 characters";
    const city = (formData.city || "").trim();
    if (!city) errs.city = "City is required";
    else if (city.length < 2) errs.city = "City must be at least 2 characters";
    else if (city.length > 100)
      errs.city = "City must be at most 100 characters";
    if (!["market", "industry"].includes(formData.areaType)) {
      errs.areaType = "Zone type must be Market or Industry";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyId: formData.companyId,
        branchId: formData.branchId,
        name,
        city,
        areaType: formData.areaType,
      };
      if (isEdit) {
        await areaService.update(id, payload);
        toastSuccess("Zone updated successfully");
      } else {
        await areaService.create(payload);
        toastSuccess("Zone created successfully");
      }
      navigate("/zones");
    } catch (err) {
      const msg =
        err?.response?.data?.error?.detail ||
        err?.message ||
        "Failed to save zone";
      toastError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading zone..." />
      </div>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>{isEdit ? "Edit Zone" : "Add Zone"}</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}
            <CForm onSubmit={handleSubmit}>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Company *</CFormLabel>
                  <CFormSelect
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    required
                    invalid={!!fieldErrors.companyId}
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={getId(c)} value={getId(c)}>
                        {c.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {fieldErrors.companyId && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.companyId}
                    </div>
                  )}
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Name *</CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Zone name"
                    required
                    minLength={2}
                    maxLength={100}
                    invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.name}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>City *</CFormLabel>
                  <CFormInput
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    required
                    minLength={2}
                    maxLength={100}
                    invalid={!!fieldErrors.city}
                  />
                  {fieldErrors.city && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.city}
                    </div>
                  )}
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Zone Type *</CFormLabel>
                  <CFormSelect
                    name="areaType"
                    value={formData.areaType}
                    onChange={handleChange}
                    required
                    invalid={!!fieldErrors.areaType}
                  >
                    <option value="market">Market</option>
                    <option value="industry">Industry</option>
                  </CFormSelect>
                  {fieldErrors.areaType && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.areaType}
                    </div>
                  )}
                </CCol>
              </CRow>
              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate("/zones")}
                >
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    "Update Zone"
                  ) : (
                    "Create Zone"
                  )}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default AreaForm;
