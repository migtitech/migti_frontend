let onNotificationNew = null;

export const registerNotificationNewHandler = (fn) => {
  onNotificationNew = typeof fn === "function" ? fn : null;
  return () => {
    onNotificationNew = null;
  };
};

export const emitNotificationNew = (payload) => {
  try {
    onNotificationNew?.(payload);
  } catch {
    // ignore handler errors
  }
};
