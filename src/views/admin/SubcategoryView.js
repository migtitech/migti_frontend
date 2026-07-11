import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CAvatar,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilPencil } from "@coreui/icons";
import subcategoryService from "../../services/subcategoryService";
import { Loader, StatusLabel } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const getSubcategoryAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const SubcategoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subcategory, setSubcategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() =>
          subcategoryService.getById(id),
        );
        const payload = res?.data?.data || res?.data || res;
        setSubcategory(payload);
      } catch (err) {
        setError(err?.message || "Failed to load subcategory");
        toastError(err?.message || "Failed to load subcategory");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading subcategory..." />
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate("/subcategories")}>
            Back to Subcategories
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  if (!subcategory) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Subcategory not found</h4>
          <CButton color="primary" onClick={() => navigate("/subcategories")}>
            Back to Subcategories
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  const categoryId = subcategory.category?._id || subcategory.category || null;
  const imageSrc =
    subcategory.imageDisplayUrl || subcategory.image || undefined;

  const handleBack = () => {
    if (categoryId) {
      navigate(`/categories/${categoryId}`);
      return;
    }
    navigate("/subcategories");
  };

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={handleBack}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back
          </CButton>
        </CCol>
        <CCol className="text-end">
          <CButton
            color="primary"
            onClick={() => navigate(`/subcategories/edit/${id}`)}
          >
            <CIcon icon={cilPencil} className="me-2" />
            Edit Subcategory
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Subcategory Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <strong>Image:</strong>
                  <CAvatar
                    src={imageSrc}
                    color={imageSrc ? undefined : "primary"}
                    textColor={imageSrc ? undefined : "white"}
                    size="xl"
                    shape="rounded-circle"
                    className={imageSrc ? "bg-transparent" : undefined}
                  >
                    {getSubcategoryAvatarLabel(subcategory.name)}
                  </CAvatar>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Subcategory Code:</strong>
                  <span>
                    <code>{subcategory.subcategoryCode || "—"}</code>
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Name:</strong>
                  <span>{subcategory.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Category:</strong>
                  <span>
                    {categoryId ? (
                      <CButton
                        color="link"
                        className="p-0 align-baseline"
                        onClick={() => navigate(`/categories/${categoryId}`)}
                      >
                        {subcategory.category?.name || "—"}
                      </CButton>
                    ) : (
                      subcategory.category?.name || "—"
                    )}
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Description:</strong>
                  <span>{subcategory.description || "—"}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  <StatusLabel status={subcategory.status} />
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default SubcategoryView;
