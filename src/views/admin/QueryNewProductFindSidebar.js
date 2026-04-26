import React, { useCallback, useEffect, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormLabel,
  CImage,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilX, cilDataTransferDown } from "@coreui/icons";
import queryNewProductService from "../../services/queryNewProductService";
import { getAssetsUrl } from "../../api/endpoints";
import { toastError } from "../../utils/toast";

const sidebarWidth = 420;

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const QueryNewProductFindSidebar = ({
  isOpen = false,
  onToggle = () => {},
  onSelectProduct = () => {},
  showFloatingToggle = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [hsnFilter, setHsnFilter] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await queryNewProductService.list({
        pageNumber: 1,
        pageSize: 50,
        name: nameFilter || undefined,
        description: descriptionFilter || undefined,
        hsnNumber: hsnFilter || undefined,
      });
      const inner = res?.data ?? res;
      setItems(inner?.items || []);
    } catch (err) {
      toastError(err?.message || "Failed to load new query products");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [nameFilter, descriptionFilter, hsnFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const firstImageUrl = (product) => {
    const list = product?.images || [];
    if (!list.length) return "";
    return getImageUrl(list[0]);
  };

  return (
    <>
      {showFloatingToggle && (
        <div
          style={{
            position: "fixed",
            right: isOpen ? sidebarWidth + 12 : 12,
            bottom: 16,
            zIndex: 3000,
            transition: "right 0.2s ease",
          }}
        >
          <CButton color="primary" onClick={onToggle}>
            {isOpen ? "Close Find Product" : "Find Product"}
          </CButton>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : -sidebarWidth,
          width: sidebarWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 12,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">New query products</h6>
          <div className="d-flex align-items-center gap-2">
            <CBadge color="info">{items.length}</CBadge>
            <CButton
              color="light"
              size="sm"
              className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
              style={{ width: 26, height: 26 }}
              onClick={onToggle}
              title="Close"
            >
              <CIcon icon={cilX} size="sm" />
            </CButton>
          </div>
        </div>

        <p className="text-muted small mb-2">
          Filter by name, description, or HSN, then use the import icon below
          each image.
        </p>

        <div className="mb-2">
          <CFormLabel className="small mb-1">Name</CFormLabel>
          <CFormInput
            size="sm"
            placeholder="Product name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
        <div className="mb-2">
          <CFormLabel className="small mb-1">Description</CFormLabel>
          <CFormInput
            size="sm"
            placeholder="Description"
            value={descriptionFilter}
            onChange={(e) => setDescriptionFilter(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <CFormLabel className="small mb-1">HSN number</CFormLabel>
          <CFormInput
            size="sm"
            placeholder="HSN"
            value={hsnFilter}
            onChange={(e) => setHsnFilter(e.target.value)}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner size="sm" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted small mb-0">No products match.</p>
          ) : (
            items.map((p) => {
              const url = firstImageUrl(p);
              return (
                <CCard key={p._id || p.uniqueId} className="mb-2">
                  <CCardBody className="py-2 px-2">
                    <div className="d-flex gap-3">
                      <div
                        className="d-flex flex-column align-items-center flex-shrink-0"
                        style={{ width: 92 }}
                      >
                        {url ? (
                          <CImage
                            src={url}
                            alt={p.name || "Product"}
                            rounded
                            thumbnail
                            className="mb-0"
                            style={{
                              width: 88,
                              height: 88,
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="bg-light rounded d-flex align-items-center justify-content-center text-muted border mb-0"
                            style={{
                              width: 88,
                              height: 88,
                              fontSize: 10,
                            }}
                          >
                            No image
                          </div>
                        )}
                        <CButton
                          type="button"
                          color="primary"
                          size="sm"
                          variant="outline"
                          className="d-inline-flex align-items-center justify-content-center p-0 mt-2"
                          style={{ width: 36, height: 36 }}
                          title="Import into form"
                          onClick={() => onSelectProduct(p)}
                        >
                          <CIcon icon={cilDataTransferDown} size="lg" />
                        </CButton>
                      </div>
                      <div className="min-w-0 flex-grow-1 text-break">
                        <div className="small text-muted">Title</div>
                        <div className="fw-semibold">
                          {p.name?.trim() ? p.name : "—"}
                        </div>
                        <div className="small text-muted mt-2">Description</div>
                        <div
                          className="small"
                          style={{
                            maxHeight: 84,
                            overflow: "auto",
                            lineHeight: 1.35,
                          }}
                        >
                          {p.description?.trim() ? p.description : "—"}
                        </div>
                        <div className="small mt-2">
                          <span className="text-muted">HSN: </span>
                          <span>{p.hsnNumber?.trim() ? p.hsnNumber : "—"}</span>
                        </div>
                        <div className="small">
                          <span className="text-muted">Unit: </span>
                          <span>
                            {p.unit != null && String(p.unit).trim()
                              ? p.unit
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default QueryNewProductFindSidebar;
