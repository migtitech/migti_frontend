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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CAvatar,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import categoryService from "../../services/categoryService";
import Filtered from "../../filtered/Filtered";
import { EyeIcon, Loader, StatusLabel } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const getBrandAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getBrandIconSrc = (brand) =>
  brand?.iconDisplayUrl || brand?.iconUrl || brand?.logoDisplayUrl || undefined;

const matchesSearch = (searchTerm, ...values) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;
  return values.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(query),
  );
};

const CategoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => categoryService.getById(id));
        const payload = res?.data?.data || res?.data || res;
        setCategory(payload);
      } catch (err) {
        setError(err?.message || "Failed to load category");
        toastError(err?.message || "Failed to load category");
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
          <Loader message="Loading category..." />
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate("/categories")}>
            Back to Categories
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  if (!category) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Category not found</h4>
          <CButton color="primary" onClick={() => navigate("/categories")}>
            Back to Categories
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  const subcategories = category.subcategories || [];
  const mappedBrands = category.brands || [];

  const filteredSubcategories = subcategories.filter((sub) =>
    matchesSearch(subcategorySearch, sub.name, sub.subcategoryCode),
  );

  const filteredMappedBrands = mappedBrands.filter((brand) =>
    matchesSearch(brandSearch, brand.name),
  );

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate("/categories")}
          >
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Categories
          </CButton>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol xs={12} lg={6} className="mb-4 mb-lg-0">
          <CCard className="h-100">
            <CCardHeader>
              <strong>Category Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Category Code:</strong>
                  <span>
                    <code>{category.categoryCode || "—"}</code>
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Name:</strong>
                  <span>{category.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Group:</strong>
                  <span>{category.group?.name || "—"}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Description:</strong>
                  <span>{category.description || "—"}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  <StatusLabel status={category.status} />
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={6}>
          <CCard className="h-100">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Subcategories</strong>
              <CButton
                color="primary"
                size="sm"
                onClick={() => navigate(`/subcategories/new?category=${id}`)}
              >
                Add Subcategory
              </CButton>
            </CCardHeader>
            <CCardBody>
              {subcategories.length > 0 && (
                <CRow className="mb-3">
                  <CCol xs={12}>
                    <Filtered
                      searchTerm={subcategorySearch}
                      setSearchTerm={setSubcategorySearch}
                    />
                  </CCol>
                </CRow>
              )}
              {subcategories.length > 0 ? (
                filteredSubcategories.length > 0 ? (
                  <CTable hover responsive className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Code</CTableHeaderCell>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>View</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredSubcategories.map((sub) => (
                        <CTableRow key={sub._id}>
                          <CTableDataCell>
                            <code>{sub.subcategoryCode || "—"}</code>
                          </CTableDataCell>
                          <CTableDataCell>{sub.name ?? "—"}</CTableDataCell>
                          <CTableDataCell>
                            <StatusLabel status={sub.status} />
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/subcategories/${sub._id}`)
                              }
                              title="View"
                            >
                              <EyeIcon />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                ) : (
                  <p className="text-muted text-center mb-0">
                    No subcategories found matching &quot;{subcategorySearch}
                    &quot;
                  </p>
                )
              ) : (
                <p className="text-muted text-center mb-0">No subcategories</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Mapped Brands</strong>
        </CCardHeader>
        <CCardBody>
          {mappedBrands.length > 0 && (
            <CRow className="mb-3">
              <CCol xs={12} sm={6} md={4}>
                <Filtered
                  searchTerm={brandSearch}
                  setSearchTerm={setBrandSearch}
                />
              </CCol>
            </CRow>
          )}
          {mappedBrands.length > 0 ? (
            filteredMappedBrands.length > 0 ? (
              <div className="overflow-auto" style={{ maxHeight: "180px" }}>
                <CRow className="g-2">
                  {filteredMappedBrands.map((brand) => {
                    const iconSrc = getBrandIconSrc(brand);
                    return (
                      <CCol key={brand._id} xs={4} sm={3} md={2} lg={2}>
                        <div className="border rounded p-2 h-100 text-center">
                          <CAvatar
                            src={iconSrc}
                            color={iconSrc ? undefined : "primary"}
                            textColor={iconSrc ? undefined : "white"}
                            size="md"
                            shape="rounded-circle"
                            className={`mb-1${iconSrc ? " bg-transparent" : ""}`}
                          >
                            {getBrandAvatarLabel(brand.name)}
                          </CAvatar>
                          <div
                            className="small fw-semibold text-truncate"
                            title={brand.name}
                          >
                            {brand.name}
                          </div>
                          <div className="mt-1">
                            <StatusLabel status={brand.status} />
                          </div>
                        </div>
                      </CCol>
                    );
                  })}
                </CRow>
              </div>
            ) : (
              <p className="text-muted text-center mb-0">
                No brands found matching &quot;{brandSearch}&quot;
              </p>
            )
          ) : (
            <p className="text-muted text-center mb-0">No brands mapped</p>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default CategoryView;
