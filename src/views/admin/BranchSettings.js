import React, { useCallback, useEffect, useState } from "react";
import branchService from "../../services/branchService";
import documentService from "../../services/documentService";
import useBranchContext from "../../hooks/useBranchContext";
import AuthImage from "../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  Input,
  Spinner,
} from "../../components/ui";
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
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No branch is available. Contact admin to configure branch settings.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center">
              <Loader message="Loading settings..." />
            </div>
          ) : !branch ? (
            <p className="text-sm text-muted-foreground">Branch not found.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload the HR signature for <strong>{branch.name}</strong>. This
                image appears on generated salary slip PDFs.
              </p>

              <Label>Current Signature</Label>
              <div className="mb-4 mt-1.5 flex items-center justify-center rounded-lg border border-border bg-muted p-3">
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
                  <span className="text-sm text-muted-foreground">
                    No signature uploaded yet
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branchSettingsSignature">
                  Upload / Replace Signature
                </Label>
                <Input
                  id="branchSettingsSignature"
                  type="file"
                  accept="image/*"
                  disabled={uploadingSignature}
                  onChange={handleSignatureUpload}
                  className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Image format only (max 10MB). Used on salary slip PDFs.
              </div>
              {uploadingSignature && (
                <div className="mt-3 flex items-center gap-2 text-sm text-primary!">
                  <Spinner size="sm" />
                  Uploading signature...
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchSettings;
