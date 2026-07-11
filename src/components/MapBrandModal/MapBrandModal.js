import React, { useState, useEffect } from "react";
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CSpinner,
} from "@coreui/react";
import brandService from "../../services/brandService";
import StatusLabel from "../StatusLabel/StatusLabel";
import { toastError } from "../../utils/toast";

const MapBrandModal = ({ visible, onClose, onAdd, mappedBrandIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleClose = () => {
    setSearchTerm("");
    setBrands([]);
    setSelectedBrand(null);
    onClose();
  };

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      setBrands([]);
      setSelectedBrand(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await brandService.getAll({
          pageNumber: 1,
          pageSize: 5,
          search: query,
          status: "active",
        });
        if (cancelled) return;
        const data = res?.data || res;
        const results = (data?.brands || [])
          .filter((brand) => !mappedBrandIds.includes(brand._id))
          .slice(0, 5);
        setBrands(results);
        setSelectedBrand(null);
      } catch (err) {
        if (!cancelled) toastError(err?.message || "Failed to search brands");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleAdd = () => {
    if (!selectedBrand) return;
    onAdd(selectedBrand);
    handleClose();
  };

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      alignment="center"
      size="lg"
    >
      <CModalHeader>
        <CModalTitle>Map Brand</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="position-relative mb-3">
          <CFormInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search brand by name"
          />
          {searching && (
            <CSpinner
              size="sm"
              className="position-absolute top-50 end-0 translate-middle-y me-3"
            />
          )}
        </div>

        {searchTerm.trim() && !searching && brands.length === 0 && (
          <div className="text-body-secondary mb-3">No matching brands.</div>
        )}

        {brands.length > 0 && (
          <CListGroup className="mb-3">
            {brands.map((brand) => (
              <CListGroupItem
                key={brand._id}
                action
                active={selectedBrand?._id === brand._id}
                onClick={() => setSelectedBrand(brand)}
              >
                <div className="fw-semibold">{brand.name}</div>
                {brand.description ? (
                  <div className="small text-body-secondary">
                    {brand.description.substring(0, 80)}
                  </div>
                ) : null}
              </CListGroupItem>
            ))}
          </CListGroup>
        )}

        {selectedBrand && (
          <div className="border rounded p-3 bg-light">
            <div className="fw-semibold mb-2">Brand details</div>
            <div className="mb-2">
              <span className="text-body-secondary">Name: </span>
              {selectedBrand.name}
            </div>
            <div className="mb-2">
              <span className="text-body-secondary">Description: </span>
              {selectedBrand.description || "—"}
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-body-secondary">Status:</span>
              <StatusLabel status={selectedBrand.status} />
            </div>
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={handleClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleAdd} disabled={!selectedBrand}>
          Add
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default MapBrandModal;
