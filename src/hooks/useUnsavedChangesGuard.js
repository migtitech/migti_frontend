import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const getInternalPath = (href) => {
  if (!href) return null;
  if (href.startsWith("#/")) return href.slice(1);
  if (href.startsWith("/")) return href;
  return null;
};

const useUnsavedChangesGuard = (isDirty, submitting = false) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty || submitting) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitting]);

  useEffect(() => {
    if (!isDirty || submitting) return;

    const handleClick = (event) => {
      const link = event.target.closest("a[href]");
      if (!link || link.target === "_blank") return;

      const targetPath = getInternalPath(link.getAttribute("href") || "");
      if (!targetPath || targetPath === location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingAction(() => () => navigate(targetPath));
      setLeaveConfirmVisible(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, submitting, location.pathname, navigate]);

  const requestNavigation = useCallback(
    (action) => {
      if (!isDirty || submitting) {
        action();
        return;
      }
      setPendingAction(() => action);
      setLeaveConfirmVisible(true);
    },
    [isDirty, submitting],
  );

  const confirmLeave = useCallback(() => {
    setLeaveConfirmVisible(false);
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [pendingAction]);

  const cancelLeave = useCallback(() => {
    setLeaveConfirmVisible(false);
    setPendingAction(null);
  }, []);

  return {
    leaveConfirmVisible,
    requestNavigation,
    confirmLeave,
    cancelLeave,
  };
};

export default useUnsavedChangesGuard;
