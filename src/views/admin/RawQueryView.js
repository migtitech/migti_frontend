import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilUser, cilPencil, cilCheckAlt } from "@coreui/icons";
import { Loader, TrackingTimeline } from "../../components";
import { useAuth } from "../../context/AuthContext";
import rawQueryService from "../../services/rawQueryService";
import employeeService from "../../services/employeeService";
import userService from "../../services/userService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// Get the logged-in user from localStorage to resolve performer names
const getStoredUser = () => {
  try {
    const stored = localStorage.getItem("migticrm_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getUserDisplayName = (userObj) => {
  if (!userObj) return null;
  return (
    userObj.name ||
    userObj.username ||
    (userObj.firstName
      ? [userObj.firstName, userObj.lastName].filter(Boolean).join(" ")
      : null) ||
    userObj.email ||
    null
  );
};

const getPerformerInfo = (act, cache = {}) => {
  const performer =
    act.performedBy && typeof act.performedBy === "object"
      ? act.performedBy
      : null;
  const performerAlt =
    act.performed_by && typeof act.performed_by === "object"
      ? act.performed_by
      : null;
  const p = performer || performerAlt;
  if (p) {
    return {
      name: getUserDisplayName(p) || act.performByName || null,
      email: p.email || null,
      role: p.role || p.designation || null,
    };
  }
  const performerId =
    typeof act.performedBy === "string"
      ? act.performedBy
      : typeof act.performed_by === "string"
        ? act.performed_by
        : null;
  if (performerId) {
    const cached = cache[performerId];
    if (cached) {
      return {
        name: getUserDisplayName(cached) || act.performByName || null,
        email: cached.email || null,
        role: cached.role || cached.designation || null,
      };
    }
    const storedUser = getStoredUser();
    if (
      storedUser &&
      (storedUser._id === performerId || storedUser.id === performerId)
    ) {
      return {
        name: getUserDisplayName(storedUser) || act.performByName || null,
        email: storedUser.email || null,
        role: storedUser.role || storedUser.designation || null,
      };
    }
  }
  return { name: act.performByName || null, email: null, role: null };
};

// Fetch user details by ID - check employee table first, then admin/user table
const fetchUserById = async (userId) => {
  // 1. Try employee table first
  let foundInEmployee = false;
  try {
    const res = await employeeService.getById(userId);
    const emp = res?.data?.employee || res?.data?.data || res?.data || null;
    if (emp && (emp.name || emp.email || emp.firstName)) {
      foundInEmployee = true;
      return emp; // return employee data as-is (has its own role)
    }
  } catch {
    // not found in employee table
  }

  // 2. If not in employee table, check admin/user table
  if (!foundInEmployee) {
    try {
      const res = await userService.getById(userId);
      const usr =
        res?.data?.user ||
        res?.data?.admin ||
        res?.data?.superAdmin ||
        res?.data?.data ||
        res?.data ||
        null;
      if (usr && (usr.name || usr.email || usr.firstName)) {
        // Found in admin table - show role as "Admin"
        return { ...usr, role: "Admin" };
      }
    } catch {
      // not found in admin table either
    }
  }
  return null;
};

const RawQueryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesPagination, setActivitiesPagination] = useState(null);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [error, setError] = useState("");
  const viewRecordedRef = useRef(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [actionForm, setActionForm] = useState({ action: "" });
  const [followUpForm, setFollowUpForm] = useState({
    followUpStatus: "pending",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [userCache, setUserCache] = useState({}); // cache of userId -> user object

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <CBadge color="danger">High</CBadge>;
      case "medium":
      case "normal":
        return <CBadge color="secondary">Medium</CBadge>;
      case "low":
        return <CBadge color="info">Low</CBadge>;
      default:
        return <CBadge color="secondary">{priority}</CBadge>;
    }
  };

  const fetchActivities = async (page = 1) => {
    if (!id) return;
    try {
      setActivitiesLoading(true);
      const res = await rawQueryService.getActivities(id, {
        pageNumber: page,
        pageSize: 10,
      });
      const data = res?.data?.data ?? res?.data;
      const arr = Array.isArray(data?.activities)
        ? data.activities
        : Array.isArray(data)
          ? data
          : [];
      setActivities(arr);
      setActivitiesPagination(data?.pagination ?? null);
      setActivitiesPage(page);
    } catch {
      setActivities([]);
      setActivitiesPagination(null);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await withMinimumDelay(() =>
          rawQueryService.getById(id),
        );
        const payload =
          response?.data?.rawQuery ||
          response?.data?.data ||
          response?.data?.query ||
          response?.data ||
          null;
        setQuery(payload);
        if (payload) {
          await fetchActivities();
        }
      } catch (err) {
        toastError(err?.message || "Failed to load raw query");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!query || !user || viewRecordedRef.current) return;
    const performedBy = user?.id || user?._id;
    if (!performedBy) return;
    viewRecordedRef.current = true;
    rawQueryService
      .recordActivity(id, "viewed", performedBy, {})
      .then(() => fetchActivities())
      .catch(() => {});
  }, [query, user, id]);

  // Resolve unknown user IDs from activities and created_by
  useEffect(() => {
    if (!query && activities.length === 0) return;
    const storedUser = getStoredUser();
    const idsToResolve = new Set();

    // Check created_by
    if (query?.created_by && typeof query.created_by === "string") {
      const cid = query.created_by;
      if (
        !userCache[cid] &&
        !(storedUser && (storedUser._id === cid || storedUser.id === cid))
      ) {
        idsToResolve.add(cid);
      }
    }

    // Check activity performers
    activities.forEach((act) => {
      const pid =
        typeof act.performedBy === "string"
          ? act.performedBy
          : typeof act.performed_by === "string"
            ? act.performed_by
            : null;
      if (
        pid &&
        !userCache[pid] &&
        !(storedUser && (storedUser._id === pid || storedUser.id === pid)) &&
        !(act.performedBy && typeof act.performedBy === "object") &&
        !(act.performed_by && typeof act.performed_by === "object")
      ) {
        idsToResolve.add(pid);
      }
    });

    if (idsToResolve.size === 0) return;

    const resolveUsers = async () => {
      const newCache = { ...userCache };
      for (const uid of idsToResolve) {
        if (newCache[uid]) continue;
        const userData = await fetchUserById(uid);
        if (userData) {
          newCache[uid] = userData;
        }
      }
      setUserCache(newCache);
    };
    resolveUsers();
  }, [query, activities]);

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading raw query..." />
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate("/raw-query")}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  if (!query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Raw query not found</h4>
          <CButton color="primary" onClick={() => navigate("/raw-query")}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  const files = Array.isArray(query.files) ? query.files : [];
  const supplier =
    query.supplier_id && typeof query.supplier_id === "object"
      ? query.supplier_id
      : null;
  const industry =
    query.industry_id && typeof query.industry_id === "object"
      ? query.industry_id
      : null;

  // Resolve creator: populated object > userCache > stored user
  let creator =
    query.created_by && typeof query.created_by === "object"
      ? query.created_by
      : null;
  if (!creator && query.created_by) {
    const creatorId =
      typeof query.created_by === "string" ? query.created_by : null;
    if (creatorId) {
      // Check cache first (fetched from employee/admin API)
      if (userCache[creatorId]) {
        creator = userCache[creatorId];
      } else {
        const storedUser = getStoredUser();
        if (
          storedUser &&
          (storedUser._id === creatorId || storedUser.id === creatorId)
        ) {
          creator = storedUser;
        }
      }
    }
  }

  const handleRecordAction = async (e) => {
    e.preventDefault();
    const performedBy = user?.id || user?._id;
    if (!performedBy) {
      toastError("Please log in to record an action.");
      return;
    }
    if (!actionForm.action?.trim()) {
      toastError("Please enter the action performed.");
      return;
    }
    try {
      setSubmitting(true);
      await rawQueryService.recordActivity(id, "action", performedBy, {
        action: actionForm.action.trim(),
      });
      toastSuccess("Action recorded.");
      setActionForm({ action: "" });
      setShowActionModal(false);
      await fetchActivities();
    } catch (err) {
      toastError(err?.message || "Failed to record action");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    const performedBy = user?.id || user?._id;
    if (!performedBy) {
      toastError("Please log in to submit follow-up.");
      return;
    }
    try {
      setSubmitting(true);
      await rawQueryService.recordActivity(id, "follow_up", performedBy, {
        followUpStatus: followUpForm.followUpStatus,
        note: followUpForm.note?.trim() || "",
      });
      toastSuccess("Follow-up submitted.");
      setFollowUpForm({ followUpStatus: "pending", note: "" });
      setShowFollowUpModal(false);
      await fetchActivities();
    } catch (err) {
      toastError(err?.message || "Failed to submit follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  const loadActivitiesPage = (page) => fetchActivities(page);

  const headerActions = (
    <div className="d-flex gap-1">
      <CButton
        color="primary"
        size="sm"
        onClick={() => setShowActionModal(true)}
      >
        <CIcon icon={cilPencil} className="me-1" />
        Action
      </CButton>
      <CButton
        color="success"
        size="sm"
        onClick={() => setShowFollowUpModal(true)}
      >
        <CIcon icon={cilCheckAlt} className="me-1" />
        Follow-up
      </CButton>
    </div>
  );

  const creatorForTimeline = creator
    ? {
        name: getUserDisplayName(creator) || null,
        email: creator.email || null,
        role: creator.role || creator.designation || null,
      }
    : null;

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate("/raw-query")}
          >
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Raw Queries
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Raw Query Details</strong>
              <div className="d-flex gap-2">
                {getPriorityBadge(query.priority)}
              </div>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                {(query.raw_query_number || query.rawQueryNumber) && (
                  <CListGroupItem className="d-flex justify-content-between align-items-center">
                    <strong>Query Number:</strong>
                    <span className="badge bg-dark fs-6">
                      {query.raw_query_number || query.rawQueryNumber}
                    </span>
                  </CListGroupItem>
                )}
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Title:</strong>
                  <span>{query.title || "-"}</span>
                </CListGroupItem>
                {industry && (
                  <CListGroupItem>
                    <strong>Client:</strong>
                    <div className="mt-2">
                      <div className="fw-semibold">{industry.name}</div>
                      {(industry.location || industry.address) && (
                        <div className="text-muted small">
                          {[industry.location, industry.address]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                      {(industry.email ||
                        industry.purchase_manager_name ||
                        industry.purchase_manager_phone) && (
                        <div className="text-muted small">
                          {[
                            industry.email,
                            industry.purchase_manager_name,
                            industry.purchase_manager_phone,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                    </div>
                  </CListGroupItem>
                )}
                {!industry && (query.company_info || query.companyInfo) && (
                  <CListGroupItem>
                    <strong>Company Info:</strong>
                    <p className="mb-0 mt-2">
                      {query.company_info || query.companyInfo}
                    </p>
                  </CListGroupItem>
                )}
                {supplier && (
                  <CListGroupItem>
                    <strong>Supplier Details:</strong>
                    <div className="mt-2">
                      <div className="fw-semibold">{supplier.name}</div>
                      {supplier.shopname && (
                        <div className="text-muted">{supplier.shopname}</div>
                      )}
                      <div className="text-muted small">
                        {[
                          supplier.email,
                          supplier.phone_1,
                          supplier.phone_2,
                          supplier.other_contact,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "No contact details"}
                      </div>
                      {(supplier.label || supplier.shop_location) && (
                        <div className="text-muted small">
                          {[supplier.label, supplier.shop_location]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                    </div>
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <strong>Description:</strong>
                  <p className="mb-0 mt-2">
                    {query.description || "No description provided"}
                  </p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Voice Notes:</strong>
                  {files.length > 0 ? (
                    <div className="mt-2 d-flex flex-column gap-2">
                      {files.map((file, index) => (
                        <audio key={`${index}-${file}`} controls src={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 mt-2 text-muted">
                      No voice notes attached.
                    </p>
                  )}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>
                    {formatDateTime(
                      query.createdAt ||
                        query.created_at ||
                        query.date ||
                        query.createdDate ||
                        query.updatedAt ||
                        query.updated_at,
                    )}
                  </span>
                </CListGroupItem>
                {creator && (
                  <CListGroupItem>
                    <strong>Created By:</strong>
                    <div className="mt-1 d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32, minWidth: 32 }}
                      >
                        <CIcon
                          icon={cilUser}
                          className="text-primary"
                          size="sm"
                        />
                      </div>
                      <div>
                        <div className="fw-semibold">
                          {getUserDisplayName(creator) || "Unknown"}
                        </div>
                        {creator.email && (
                          <div className="text-muted small">
                            {creator.email}
                          </div>
                        )}
                        {creator.role && (
                          <CBadge
                            color="light"
                            textColor="dark"
                            className="mt-1"
                          >
                            {creator.role}
                          </CBadge>
                        )}
                      </div>
                    </div>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <TrackingTimeline
            query={query}
            activities={activities}
            pagination={activitiesPagination}
            loading={activitiesLoading}
            onLoadPage={loadActivitiesPage}
            creator={creatorForTimeline}
            getPerformerInfo={(act) => getPerformerInfo(act, userCache)}
            headerActions={headerActions}
          />
        </CCol>
      </CRow>

      {/* Record Action Modal */}
      <CModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
      >
        <CModalHeader>
          <CModalTitle>Record Action</CModalTitle>
        </CModalHeader>
        <form onSubmit={handleRecordAction}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Action performed</CFormLabel>
              <CFormInput
                value={actionForm.action}
                onChange={(e) =>
                  setActionForm({ ...actionForm, action: e.target.value })
                }
                placeholder="e.g. Called supplier, Sent quotation"
                required
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => setShowActionModal(false)}
            >
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Record"}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* Submit Follow-up Modal */}
      <CModal
        visible={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
      >
        <CModalHeader>
          <CModalTitle>Submit Follow-up</CModalTitle>
        </CModalHeader>
        <form onSubmit={handleSubmitFollowUp}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Follow-up status</CFormLabel>
              <CFormSelect
                value={followUpForm.followUpStatus}
                onChange={(e) =>
                  setFollowUpForm({
                    ...followUpForm,
                    followUpStatus: e.target.value,
                  })
                }
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Note (optional)</CFormLabel>
              <CFormTextarea
                value={followUpForm.note}
                onChange={(e) =>
                  setFollowUpForm({ ...followUpForm, note: e.target.value })
                }
                placeholder="Add details about the follow-up"
                rows={3}
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => setShowFollowUpModal(false)}
            >
              Cancel
            </CButton>
            <CButton color="success" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit follow-up"}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>
    </>
  );
};

export default RawQueryView;
