import React, { useCallback, useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from "@coreui/react";
import branchService from "../../services/branchService";
import documentService from "../../services/documentService";
import useBranchContext from "../../hooks/useBranchContext";
import AuthImage from "../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import { toastError, toastSuccess } from "../../utils/toast";

const normalizeId = (item) => ({
  ...item,
  id: item?.id || item?._id,
});

const getSignatureDisplay = (signature) => {
  if (!signature) return { id: "", path: "" };
  if (typeof signature === "object") {
    const id = signature?._id || signature?.id || "";
    const rawPath = signature?.path || "";
    const path = rawPath?.startsWith("http") ? rawPath : getAssetsUrl(rawPath);
    return { id, path };
  }
  return { id: signature, path: "" };
};

const BranchSettings = () => {
  const { branchId: userBranchId } = useBranchContext();
  const [loading, setLoading] = useState(true);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [branch, setBranch] = useState(null);

  const resolveActiveBranchId = useCallback(async () => {
    if (userBranchId) {
      setActiveBranchId(String(userBranchId));
      return;
    }
    const res = await branchService.getAll({ pageSize: 100 });
    const data = res?.data?.data ?? res?.data ?? {};
    const list = (data.branches ?? data.companyBranches ?? []).map(normalizeId);
    if (list.length) {
      setActiveBranchId(String(list[0].id));
    }
  }, [userBranchId]);

  const loadBranch = useCallback(async () => {
    if (!activeBranchId) {
      setBranch(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await branchService.getById(activeBranchId);
      const payload =
        res?.data?.data?.branch ||
        res?.data?.data ||
        res?.data?.branch ||
        res?.data ||
        null;
      setBranch(payload ? normalizeId(payload) : null);
    } catch (err) {
      toastError(err?.message || "Failed to load branch settings");
      setBranch(null);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    resolveActiveBranchId();
  }, [resolveActiveBranchId]);

  useEffect(() => {
    loadBranch();
  }, [loadBranch]);

  const handleSignatureUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !activeBranchId) return;

    setUploadingSignature(true);
    try {
      const uploadRes = await documentService.uploadImages([file]);
      const uploadedId = uploadRes?.data?.documents?.[0]?._id;
      if (!uploadedId) {
        throw new Error("Signature upload failed, please try again.");
      }

      await branchService.update(activeBranchId, { signature: uploadedId });
      await loadBranch();
      toastSuccess("Signature uploaded successfully");
    } catch (err) {
      toastError(err?.message || "Failed to upload signature");
    } finally {
      event.target.value = "";
      setUploadingSignature(false);
    }
  };

  const signature = getSignatureDisplay(branch?.signature);

  if (!activeBranchId && !loading) {
    return (
      <CCard>
        <CCardBody className="text-muted">
          No branch is available. Contact admin to configure branch settings.
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CRow>
      <CCol xs={12} md={8} lg={6}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Settings</strong>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-4">
                <Loader message="Loading settings..." />
              </div>
            ) : !branch ? (
              <p className="text-muted mb-0">Branch not found.</p>
            ) : (
              <>
                <p className="text-muted small mb-3">
                  Upload the HR signature for <strong>{branch.name}</strong>.
                  This image appears on generated salary slip PDFs.
                </p>

                <CFormLabel>Current Signature</CFormLabel>
                <div className="mb-3 p-3 border rounded bg-light text-center">
                  {signature.id || signature.path ? (
                    <AuthImage
                      documentId={signature.id || null}
                      fallbackUrl={signature.path}
                      alt="Branch signature"
                      style={{
                        maxHeight: 80,
                        maxWidth: 220,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span className="text-muted">
                      No signature uploaded yet
                    </span>
                  )}
                </div>

                <CFormLabel htmlFor="branchSettingsSignature">
                  Upload / Replace Signature
                </CFormLabel>
                <CFormInput
                  id="branchSettingsSignature"
                  type="file"
                  accept="image/*"
                  disabled={uploadingSignature}
                  onChange={handleSignatureUpload}
                />
                <div className="small text-muted mt-2">
                  Image format only (max 10MB). Used on salary slip PDFs.
                </div>
                {uploadingSignature && (
                  <div className="mt-3 text-primary">
                    <CSpinner size="sm" className="me-2" />
                    Uploading signature...
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default BranchSettings;
