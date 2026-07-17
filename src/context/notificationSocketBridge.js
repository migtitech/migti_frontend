const handlers = new Set();

export const registerNotificationNewHandler = (fn) => {
  if (typeof fn !== "function") return () => {};
  handlers.add(fn);
  return () => {
    handlers.delete(fn);
  };
};

export const emitNotificationNew = (payload) => {
  for (const fn of handlers) {
    try {
      fn(payload);
    } catch {
      // ignore handler errors
    }
  }
};
