// Attachments in the Business Partner overlay only ever store a file name
// (no actual file bytes are uploaded — see data/businessPartnerDummy.js), so
// there is nothing real to preview. This opens a lightweight mock viewer tab
// so clicking an attachment still feels like a working "View" action.
export const openAttachmentPreview = (attachment) => {
  if (!attachment) return;
  if (attachment.url) {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
    return;
  }

  const fileName = attachment.fileName || "attachment";
  const uploadedAt = attachment.uploadedAt
    ? new Date(attachment.uploadedAt).toLocaleString()
    : "-";
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${fileName}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f4f5f7; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
  .card { background: #fff; border-radius: 12px; padding: 32px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; max-width: 420px; }
  .icon { font-size: 40px; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0 0 8px; word-break: break-all; }
  p { color: #6b7280; font-size: 13px; margin: 4px 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">📎</div>
    <h1>${fileName}</h1>
    <p>Uploaded: ${uploadedAt}</p>
    <p>This is a demo preview — no file was actually uploaded to storage yet.</p>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
};

export default openAttachmentPreview;
