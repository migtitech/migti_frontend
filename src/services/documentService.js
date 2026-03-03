import axiosClient from '../api/axiosClient'
import { DOCUMENTS } from '../api/endpoints'

const documentService = {
  /**
   * Upload one or more images to the documents API.
   * Returns { documents: [{ _id, path }] }.
   */
  uploadImages: async (files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    const response = await axiosClient.post(DOCUMENTS.UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },
}

export default documentService

