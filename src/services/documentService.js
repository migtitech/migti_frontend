import axiosClient from "../api/axiosClient";
import { DOCUMENTS } from "../api/endpoints";

const documentService = {
  /**
   * Upload one or more images to the documents API.
   * Returns { documents: [{ _id, path }] }.
   */
  uploadImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    const response = await axiosClient.post(DOCUMENTS.UPLOAD, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },

  /** Images and PDF (PO/billing attachments). Field name: files. */
  uploadAttachments: async (files) => {
    const formData = new FormData();
    (Array.isArray(files) ? files : [files]).forEach((file) => {
      if (file) formData.append("files", file);
    });
    const response = await axiosClient.post(
      DOCUMENTS.UPLOAD_ATTACHMENT,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response;
  },
};

export default documentService;
