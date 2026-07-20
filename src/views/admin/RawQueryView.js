import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { User, Pencil, Check } from "lucide-react";
import { Loader, TrackingTimeline, BackButton } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Textarea,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import rawQueryService from "../../services/rawQueryService";
import employeeService from "../../services/employeeService";
import userService from "../../services/userService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

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
        return <Badge variant="destructive">High</Badge>;
      case "medium":
      case "normal":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="info">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
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
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading raw query..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <BackButton fallback="/raw-query" />
        </CardContent>
      </Card>
    );
  }

  if (!query) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Raw query not found</h4>
          <BackButton fallback="/raw-query" />
        </CardContent>
      </Card>
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
      toastSuccess("Action recorded");
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
      toastSuccess("Follow-up submitted");
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
    <div className="flex gap-1">
      <Button type="button" size="sm" onClick={() => setShowActionModal(true)}>
        <Pencil className="h-4 w-4" />
        Action
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => setShowFollowUpModal(true)}
      >
        <Check className="h-4 w-4" />
        Follow-up
      </Button>
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
    <div>
      <div className="mb-4">
        <BackButton fallback="/raw-query" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Raw Query Details</CardTitle>
              <div className="flex gap-2">
                {getPriorityBadge(query.priority)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-border">
                {(query.raw_query_number || query.rawQueryNumber) && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Query Number:
                    </span>
                    <Badge>
                      {query.raw_query_number || query.rawQueryNumber}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Title:
                  </span>
                  <span className="text-sm text-foreground">
                    {query.title || "-"}
                  </span>
                </div>
                {industry && (
                  <div className="py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Client:
                    </span>
                    <div className="mt-2">
                      <div className="font-semibold text-foreground">
                        {industry.name}
                      </div>
                      {(industry.location || industry.address) && (
                        <div className="text-sm text-muted-foreground">
                          {[industry.location, industry.address]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                      {(industry.email ||
                        industry.purchase_manager_name ||
                        industry.purchase_manager_phone) && (
                        <div className="text-sm text-muted-foreground">
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
                  </div>
                )}
                {!industry && (query.company_info || query.companyInfo) && (
                  <div className="py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Company Info:
                    </span>
                    <p className="mt-2 text-sm text-foreground">
                      {query.company_info || query.companyInfo}
                    </p>
                  </div>
                )}
                {supplier && (
                  <div className="py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Supplier Details:
                    </span>
                    <div className="mt-2">
                      <div className="font-semibold text-foreground">
                        {supplier.name}
                      </div>
                      {supplier.shopname && (
                        <div className="text-muted-foreground">
                          {supplier.shopname}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
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
                        <div className="text-sm text-muted-foreground">
                          {[supplier.label, supplier.shop_location]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Description:
                  </span>
                  <p className="mt-2 text-sm text-foreground">
                    {query.description || "No description provided"}
                  </p>
                </div>
                <div className="py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Voice Notes:
                  </span>
                  {files.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-2">
                      {files.map((file, index) => (
                        <audio key={`${index}-${file}`} controls src={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No voice notes attached.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Created At:
                  </span>
                  <span className="text-sm text-foreground">
                    {dateTimeFormatter(
                      query.createdAt ||
                        query.created_at ||
                        query.date ||
                        query.createdDate ||
                        query.updatedAt ||
                        query.updated_at,
                      "-",
                    )}
                  </span>
                </div>
                {creator && (
                  <div className="py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Created By:
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex h-8 w-8 min-w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary!" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {getUserDisplayName(creator) || "Unknown"}
                        </div>
                        {creator.email && (
                          <div className="text-sm text-muted-foreground">
                            {creator.email}
                          </div>
                        )}
                        {creator.role && (
                          <Badge variant="secondary" className="mt-1">
                            {creator.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div>
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
        </div>
      </div>

      {/* Record Action Modal */}
      <Dialog
        open={showActionModal}
        onOpenChange={(o) => !o && setShowActionModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Action</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordAction}>
            <div className="space-y-1.5">
              <Label>Action performed</Label>
              <Input
                value={actionForm.action}
                onChange={(e) =>
                  setActionForm({ ...actionForm, action: e.target.value })
                }
                placeholder="e.g. Called supplier, Sent quotation"
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowActionModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Follow-up Modal */}
      <Dialog
        open={showFollowUpModal}
        onOpenChange={(o) => !o && setShowFollowUpModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFollowUp}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Follow-up status</Label>
                <Select
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
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Textarea
                  value={followUpForm.note}
                  onChange={(e) =>
                    setFollowUpForm({ ...followUpForm, note: e.target.value })
                  }
                  placeholder="Add details about the follow-up"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFollowUpModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RawQueryView;
