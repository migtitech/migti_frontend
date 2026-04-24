import { useMemo } from "react";
import { useAuth, FULL_ACCESS_ROLES } from "../context/AuthContext";

/**
 * Branch context for branch-based data isolation (same pattern as Queries/Quotations).
 * - branchId: current user's branch (from auth); use for defaulting create forms and for list filter when branch-scoped.
 * - canSelectBranch: true for admin/super_admin so UI can show branch dropdown and pass branchId in list params.
 */
const useBranchContext = () => {
  const { user } = useAuth();

  const branchId = useMemo(() => {
    const raw = user?.branchId ?? user?.branch_id;
    if (raw == null) return null;
    return String(raw);
  }, [user?.branchId, user?.branch_id]);

  const canSelectBranch = useMemo(
    () => !!user && FULL_ACCESS_ROLES.includes(user.role),
    [user],
  );

  return {
    branchId,
    canSelectBranch,
  };
};

export default useBranchContext;
