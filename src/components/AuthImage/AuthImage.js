import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";

/**
 * Image that loads via authenticated API (GET /documents/serve/:id) so it works
 * when direct URLs require auth or signed URLs have token/expiry issues.
 */
const AuthImage = ({
  documentId,
  fallbackUrl,
  alt = "",
  className,
  style,
  ...rest
}) => {
  const [src, setSrc] = useState(fallbackUrl || "");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!documentId) {
      setSrc(fallbackUrl || "");
      setError(false);
      return;
    }
    let objectUrl = null;
    const load = async () => {
      try {
        const response = await axiosClient.get(DOCUMENTS.SERVE(documentId), {
          responseType: "blob",
        });
        if (response?.data instanceof Blob) {
          objectUrl = URL.createObjectURL(response.data);
          setSrc(objectUrl);
          setError(false);
        } else {
          setSrc(fallbackUrl || "");
        }
      } catch (err) {
        setError(true);
        setSrc(fallbackUrl || "");
      }
    };
    load();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, fallbackUrl]);

  if (error && !fallbackUrl) return null;
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
      {...rest}
    />
  );
};

export default AuthImage;
