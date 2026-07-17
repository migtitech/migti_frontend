import React, { useState, useEffect } from "react";
import { Search, User, Pencil, Check, Clock, Mail, Phone } from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { EyeIcon, TablePagination } from "../../components";
import rawQueryService from "../../services/rawQueryService";
import queryService from "../../services/queryService";
import employeeService from "../../services/employeeService";
import userService from "../../services/userService";
import { toastError } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const getTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return dateFormatter(dateStr, "-");
};

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

// Fetch user details by ID - try employee first, then admin/user
const fetchUserById = async (userId) => {
  try {
    const res = await employeeService.getById(userId);
    const emp = res?.data?.employee || res?.data?.data || res?.data || null;
    if (emp && (emp.name || emp.email || emp.firstName)) return emp;
  } catch {
    /* not an employee */
  }
  try {
    const res = await userService.getById(userId);
    const usr =
      res?.data?.user ||
      res?.data?.admin ||
      res?.data?.data ||
      res?.data ||
      null;
    if (usr && (usr.name || usr.email || usr.firstName))
      return { ...usr, role: usr.role || "admin" };
  } catch {
    /* not found */
  }
  return null;
};

const Tracking = () => {
  const [trackingType, setTrackingType] = useState("rawQuery"); // 'rawQuery' | 'query'
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesPagination, setActivitiesPagination] = useState(null);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userCache, setUserCache] = useState({});

  const handleSearch = async () => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      toastError(
        trackingType === "query"
          ? "Please enter a query code (e.g. QRY012345) or ID"
          : "Please enter a raw query number or ID",
      );
      return;
    }
    try {
      setLoading(true);
      setSearched(true);
      setQuery(null);
      setActivities([]);
      setActivitiesPagination(null);
      setActivitiesPage(1);

      let payload = null;
      let recordId = null;

      if (trackingType === "query") {
        // Query Tracking: search by QRY0... or ID
        if (trimmed.toUpperCase().startsWith("QRY0")) {
          try {
            const searchRes = await queryService.searchByCode(trimmed);
            const searchData = searchRes?.data || {};
            const result = searchData?.data ?? searchData;
            const results = result?.queries || [];
            const match = results.find(
              (q) =>
                (q.queryCode || "").toUpperCase() === trimmed.toUpperCase(),
            );
            if (match) {
              recordId = match._id || match.id;
              const fullRes = await queryService.getById(recordId);
              const fullData = fullRes?.data || fullRes;
              payload = fullData?.data ?? fullData ?? match;
            }
          } catch {
            // fall through
          }
        }
        if (!payload) {
          try {
            const response = await queryService.getById(trimmed);
            const resData = response?.data || response;
            payload = resData?.data ?? resData ?? null;
            recordId = payload?._id || payload?.id || trimmed;
          } catch {
            // not found
          }
        }
        if (!payload || (!payload._id && !payload.id)) {
          toastError("Query not found");
          setQuery(null);
          setLoading(false);
          return;
        }
        setQuery(payload);
        recordId = payload._id || payload.id;
        try {
          const actRes = await queryService.getActivities(recordId, {
            pageNumber: 1,
            pageSize: 10,
          });
          const resData = actRes?.data;
          const data = resData?.data ?? resData;
          const arr = Array.isArray(data?.activities)
            ? data.activities
            : Array.isArray(data)
              ? data
              : [];
          setActivities(arr);
          setActivitiesPagination(data?.pagination ?? null);
          setActivitiesPage(1);
        } catch {
          setActivities([]);
          setActivitiesPagination(null);
        }
      } else {
        // Raw Query Tracking (existing logic)
        if (trimmed.toUpperCase().startsWith("RQRY")) {
          try {
            const searchRes = await rawQueryService.searchByNumber(trimmed);
            const searchData = searchRes?.data || {};
            const results =
              searchData.rawQueries || searchData?.data?.rawQueries || [];
            const match = results.find(
              (q) =>
                (q.raw_query_number || q.rawQueryNumber || "").toUpperCase() ===
                trimmed.toUpperCase(),
            );
            if (match) {
              recordId = match._id || match.id;
              const fullRes = await rawQueryService.getById(recordId);
              payload =
                fullRes?.data?.rawQuery ||
                fullRes?.data?.data ||
                fullRes?.data?.query ||
                fullRes?.data ||
                null;
            }
          } catch {
            // Fall through
          }
        }
        if (!payload) {
          try {
            const response = await rawQueryService.getById(trimmed);
            payload =
              response?.data?.rawQuery ||
              response?.data?.data ||
              response?.data?.query ||
              response?.data ||
              null;
            recordId = payload?._id || payload?.id || trimmed;
          } catch {
            // Not found
          }
        }
        if (!payload || (!payload._id && !payload.id)) {
          toastError("Raw query not found");
          setQuery(null);
          setLoading(false);
          return;
        }
        setQuery(payload);
        recordId = payload._id || payload.id;
        try {
          const actRes = await rawQueryService.getActivities(recordId, {
            pageNumber: 1,
            pageSize: 10,
          });
          const resData = actRes?.data;
          const data = resData?.data ?? resData;
          const arr = Array.isArray(data?.activities)
            ? data.activities
            : Array.isArray(data)
              ? data
              : [];
          setActivities(arr);
          setActivitiesPagination(data?.pagination ?? null);
          setActivitiesPage(1);
        } catch {
          setActivities([]);
          setActivitiesPagination(null);
        }
      }
    } catch {
      toastError(
        trackingType === "query"
          ? "Query not found or invalid ID"
          : "Raw query not found or invalid ID",
      );
      setQuery(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const loadActivitiesPage = async (page) => {
    if (!query?._id && !query?.id) return;
    const recordId = query._id || query.id;
    try {
      setLoading(true);
      if (trackingType === "query") {
        const actRes = await queryService.getActivities(recordId, {
          pageNumber: page,
          pageSize: 10,
        });
        const data = actRes?.data?.data ?? actRes?.data;
        setActivities(Array.isArray(data?.activities) ? data.activities : []);
        setActivitiesPagination(data?.pagination ?? null);
      } else {
        const actRes = await rawQueryService.getActivities(recordId, {
          pageNumber: page,
          pageSize: 10,
        });
        const data = actRes?.data?.data ?? actRes?.data;
        setActivities(Array.isArray(data?.activities) ? data.activities : []);
        setActivitiesPagination(data?.pagination ?? null);
      }
      setActivitiesPage(page);
    } catch {
      setActivities([]);
      setActivitiesPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // Resolve unknown user IDs from activities and created_by
  useEffect(() => {
    if (!query && activities.length === 0) return;
    const storedUser = getStoredUser();
    const idsToResolve = new Set();

    if (query?.created_by && typeof query.created_by === "string") {
      const cid = query.created_by;
      if (
        !userCache[cid] &&
        !(storedUser && (storedUser._id === cid || storedUser.id === cid))
      ) {
        idsToResolve.add(cid);
      }
    }

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
        return <Badge variant="secondary">{priority || "N/A"}</Badge>;
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "viewed":
        return null;
      case "action":
        return Pencil;
      case "follow_up":
        return Check;
      default:
        return Pencil;
    }
  };

  const getActivityLabel = (type) => {
    switch (type) {
      case "viewed":
        return "Viewed";
      case "action":
        return "Action Recorded";
      case "follow_up":
        return "Follow-up";
      default:
        return type || "Activity";
    }
  };

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case "viewed":
        return "info";
      case "action":
        return "warning";
      case "follow_up":
        return "success";
      default:
        return "secondary";
    }
  };

  const getFollowUpStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "default";
      case "pending":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Maps an activity badge variant to a solid circle background class
  const activityCircleBg = {
    info: "bg-primary!",
    warning: "bg-warning!",
    success: "bg-success!",
    secondary: "bg-secondary!",
  };

  const getPerformerInfo = (act) => {
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
        name: getUserDisplayName(p) || act.performByName || p.name,
        email: p.email || null,
        phone: p.phone || p.phone_1 || null,
        role: p.role || p.designation || null,
      };
    }
    // performedBy is just a string ID
    const performerId =
      typeof act.performedBy === "string"
        ? act.performedBy
        : typeof act.performed_by === "string"
          ? act.performed_by
          : null;
    if (performerId) {
      // Check user cache (fetched from employee/admin API)
      const cached = userCache[performerId];
      if (cached) {
        return {
          name: getUserDisplayName(cached),
          email: cached.email || null,
          phone: cached.phone || cached.phone_1 || null,
          role: cached.role || cached.designation || null,
        };
      }
      // Match with stored user
      const storedUser = getStoredUser();
      if (
        storedUser &&
        (storedUser._id === performerId || storedUser.id === performerId)
      ) {
        return {
          name: getUserDisplayName(storedUser),
          email: storedUser.email || null,
          phone: storedUser.phone || storedUser.phone_1 || null,
          role: storedUser.role || storedUser.designation || null,
        };
      }
    }
    return { name: null, email: null, phone: null, role: null };
  };

  const getTimestamp = (act) => {
    return act.createdAt || act.created_at || act.timestamp || null;
  };

  const supplier =
    query?.supplier_id && typeof query.supplier_id === "object"
      ? query.supplier_id
      : null;
  const industry =
    query?.industry_id && typeof query.industry_id === "object"
      ? query.industry_id
      : null;

  // Resolve creator: populated object > userCache > stored user
  let creator =
    query?.created_by && typeof query.created_by === "object"
      ? query.created_by
      : null;
  if (!creator && query?.created_by) {
    const creatorId =
      typeof query.created_by === "string" ? query.created_by : null;
    if (creatorId) {
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

  const getQueryStatusBadge = (status) => {
    const colorMap = {
      closed: "secondary",
      convertedToQuotation: "success",
      progress: "default",
      followup01pending: "warning",
      followup02pending: "warning",
      followup03pending: "warning",
      pending: "info",
    };
    return (
      <Badge variant={colorMap[status] || "secondary"}>{status || "—"}</Badge>
    );
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex-row flex-wrap items-center gap-4">
          <CardTitle>Tracking</CardTitle>
          <Tabs
            value={trackingType}
            onValueChange={(val) => {
              setTrackingType(val);
              setQuery(null);
              setActivities([]);
              setSearched(false);
              setSearchInput("");
            }}
          >
            <TabsList>
              <TabsTrigger value="rawQuery">Raw Query Tracking</TabsTrigger>
              <TabsTrigger value="query">Query Tracking</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-full max-w-xl">
            <p className="mb-3 text-sm text-muted-foreground">
              {trackingType === "query"
                ? "Enter a query code (e.g. QRY012345) or ID to view its complete tracking history"
                : "Enter a raw query number (e.g. RQRY0XXXXX) or ID to view its complete tracking history"}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={
                    trackingType === "query"
                      ? "e.g. QRY012345 or query ID..."
                      : "e.g. RQRY012345 or query ID..."
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={loading}>
                {loading ? <Spinner size="sm" /> : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="py-10 text-center">
          <Spinner size="lg" className="mx-auto text-primary!" />
          <p className="mt-2 text-sm text-muted-foreground">
            Fetching tracking data...
          </p>
        </div>
      )}

      {!loading && searched && !query && (
        <Card>
          <CardContent className="py-10 pt-10 text-center">
            <h5 className="text-lg font-semibold text-muted-foreground">
              {trackingType === "query"
                ? "No query found"
                : "No raw query found"}
            </h5>
            <p className="text-sm text-muted-foreground">
              Please check the number/ID and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && query && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left side - Details */}
          <div className="lg:col-span-5">
            {trackingType === "query" ? (
              <Card className="mb-4">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Query Details</CardTitle>
                  {getQueryStatusBadge(query.status)}
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {query.queryCode && (
                      <div className="flex items-center justify-between py-3">
                        <strong className="font-semibold">Query Code</strong>
                        <Badge variant="info">{query.queryCode}</Badge>
                      </div>
                    )}
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Query ID</strong>
                      <span className="ml-3 break-all text-right text-sm text-muted-foreground">
                        {query._id || query.id}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Company</strong>
                      <span className="ml-3 text-right">
                        {query.companyInfo?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Location</strong>
                      <span className="ml-3 text-right">
                        {query.companyInfo?.location || "-"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Products</strong>
                      <span>
                        {query.products?.length
                          ? `${query.products.length} item(s)`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">
                        Contact person(s)
                      </strong>
                      <span className="ml-3 text-right">
                        {(query.companyInfo?.purchaseManagers || []).length > 0
                          ? (query.companyInfo.purchaseManagers || [])
                              .map((m) => m.name || m.phone)
                              .filter(Boolean)
                              .join(", ") || "–"
                          : query.companyInfo?.purchase_manager_name ||
                              query.companyInfo?.purchase_manager_phone
                            ? `${query.companyInfo?.purchase_manager_name || ""} • ${query.companyInfo?.purchase_manager_phone || ""}`
                            : "–"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <strong className="font-semibold">Created</strong>
                      <span className="text-sm">
                        {dateTimeFormatter(
                          query.createdAt || query.created_at,
                          "-",
                        )}
                      </span>
                    </div>
                    {creator && (
                      <div className="py-3">
                        <strong className="font-semibold">Created By</strong>
                        <div className="mt-1 flex items-center gap-2">
                          <div
                            className="flex items-center justify-center rounded-full bg-primary/10"
                            style={{ width: 32, height: 32, minWidth: 32 }}
                          >
                            <User className="h-3.5 w-3.5 text-primary!" />
                          </div>
                          <div>
                            <div className="font-semibold">
                              {getUserDisplayName(creator) || "Unknown"}
                            </div>
                            {creator.email && (
                              <div className="text-sm text-muted-foreground">
                                {creator.email}
                              </div>
                            )}
                            {creator.role && (
                              <Badge variant="outline" className="mt-1">
                                {creator.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-4">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Query Details</CardTitle>
                  {getPriorityBadge(query.priority)}
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {(query.raw_query_number || query.rawQueryNumber) && (
                      <div className="flex items-center justify-between py-3">
                        <strong className="font-semibold">Query Number</strong>
                        <Badge variant="secondary">
                          {query.raw_query_number || query.rawQueryNumber}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Title</strong>
                      <span className="ml-3 text-right">
                        {query.title || "-"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <strong className="font-semibold">Query ID</strong>
                      <span className="ml-3 break-all text-right text-sm text-muted-foreground">
                        {query._id || query.id}
                      </span>
                    </div>
                    {industry && (
                      <div className="py-3">
                        <strong className="font-semibold">Client</strong>
                        <div className="mt-1">
                          <div className="font-semibold">{industry.name}</div>
                          {(industry.location || industry.address) && (
                            <div className="text-sm text-muted-foreground">
                              {[industry.location, industry.address]
                                .filter(Boolean)
                                .join(" | ")}
                            </div>
                          )}
                          {industry.email && (
                            <div className="text-sm text-muted-foreground">
                              {industry.email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!industry && (query.company_info || query.companyInfo) && (
                      <div className="py-3">
                        <strong className="font-semibold">Company Info</strong>
                        <p className="mb-0 mt-1">
                          {query.company_info || query.companyInfo}
                        </p>
                      </div>
                    )}
                    {supplier && (
                      <div className="py-3">
                        <strong className="font-semibold">Supplier</strong>
                        <div className="mt-1">
                          <div className="font-semibold">{supplier.name}</div>
                          {supplier.shopname && (
                            <div className="text-sm text-muted-foreground">
                              {supplier.shopname}
                            </div>
                          )}
                          {(supplier.email || supplier.phone_1) && (
                            <div className="text-sm text-muted-foreground">
                              {[supplier.email, supplier.phone_1]
                                .filter(Boolean)
                                .join(" | ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="py-3">
                      <strong className="font-semibold">Description</strong>
                      <p className="mb-0 mt-1">
                        {query.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <strong className="font-semibold">Created</strong>
                      <span className="text-sm">
                        {dateTimeFormatter(
                          query.createdAt || query.created_at,
                          "-",
                        )}
                      </span>
                    </div>
                    {creator && (
                      <div className="py-3">
                        <strong className="font-semibold">Created By</strong>
                        <div className="mt-1 flex items-center gap-2">
                          <div
                            className="flex items-center justify-center rounded-full bg-primary/10"
                            style={{ width: 32, height: 32, minWidth: 32 }}
                          >
                            <User className="h-3.5 w-3.5 text-primary!" />
                          </div>
                          <div>
                            <div className="font-semibold">
                              {getUserDisplayName(creator) || "Unknown"}
                            </div>
                            {creator.email && (
                              <div className="text-sm text-muted-foreground">
                                {creator.email}
                              </div>
                            )}
                            {creator.role && (
                              <Badge variant="outline" className="mt-1">
                                {creator.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right side - Full Tracking Timeline */}
          <div className="lg:col-span-7">
            <Card className="mb-4">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>Tracking Timeline</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    {activitiesPagination?.totalItems ?? activities.length}{" "}
                    {activitiesPagination?.totalItems === 1
                      ? "activity"
                      : "activities"}
                  </Badge>
                  <TablePagination
                    currentPage={activitiesPagination?.currentPage ?? 1}
                    totalPages={activitiesPagination?.totalPages ?? 1}
                    onPageChange={loadActivitiesPage}
                    disabled={loading}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {/* Created entry */}
                <div className="mb-3 flex items-start border-b border-border pb-3">
                  <div
                    className="mr-3 flex items-center justify-center rounded-full bg-primary!"
                    style={{ width: 40, height: 40, minWidth: 40 }}
                  >
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">Created</Badge>
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        {dateTimeFormatter(
                          query.createdAt || query.created_at,
                          "-",
                        )}
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">
                          {getUserDisplayName(creator) || "—"}
                        </span>
                        {creator?.role && (
                          <Badge variant="outline" className="ml-1">
                            {creator.role}
                          </Badge>
                        )}
                      </div>
                      {creator?.email && (
                        <div className="ml-3 flex items-center text-sm text-muted-foreground">
                          <Mail className="mr-1 h-3.5 w-3.5" />
                          {creator.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity timeline */}
                {activities.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-2 block h-8 w-8" />
                    No tracking activities recorded yet.
                  </div>
                ) : (
                  activities.map((act, index) => {
                    const performer = getPerformerInfo(act);
                    const timestamp = getTimestamp(act);
                    const isLast = index === activities.length - 1;
                    const ActivityIcon = getActivityIcon(act.type);
                    return (
                      <div
                        key={act._id || act.id || index}
                        className={cn(
                          "mb-3 flex items-start",
                          !isLast && "border-b border-border pb-3",
                        )}
                      >
                        <div
                          className={cn(
                            "mr-3 flex items-center justify-center rounded-full",
                            activityCircleBg[getActivityBadgeColor(act.type)] ||
                              "bg-secondary!",
                          )}
                          style={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                          }}
                        >
                          {act.type === "viewed" ? (
                            <EyeIcon size={20} className="text-white" />
                          ) : (
                            ActivityIcon && (
                              <ActivityIcon className="h-4 w-4 text-white" />
                            )
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getActivityBadgeColor(act.type)}>
                              {getActivityLabel(act.type)}
                            </Badge>
                            <span className="flex items-center text-sm text-muted-foreground">
                              <Clock className="mr-1 h-3.5 w-3.5" />
                              {dateTimeFormatter(timestamp, "-")}
                            </span>
                          </div>

                          {/* Performer details */}
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-semibold">
                                {performer.name || act.performByName || "—"}
                              </span>
                              {performer.role && (
                                <Badge variant="outline">
                                  {performer.role}
                                </Badge>
                              )}
                            </div>
                            {performer.email && (
                              <div className="ml-6 flex items-center text-sm text-muted-foreground">
                                <Mail className="mr-1 h-3.5 w-3.5" />
                                {performer.email}
                              </div>
                            )}
                            {performer.phone && (
                              <div className="ml-6 flex items-center text-sm text-muted-foreground">
                                <Phone className="mr-1 h-3.5 w-3.5" />
                                {performer.phone}
                              </div>
                            )}
                          </div>

                          {/* Action details */}
                          {act.type === "action" &&
                            (act.meta?.action || act.metadata?.action) && (
                              <div className="mt-2 rounded bg-muted p-2 text-sm">
                                <strong>Action:</strong>{" "}
                                {act.meta?.action || act.metadata?.action}
                              </div>
                            )}

                          {/* Follow-up details */}
                          {act.type === "follow_up" && (
                            <div className="mt-2 rounded bg-muted p-2 text-sm">
                              {(act.meta?.followUpStatus ||
                                act.metadata?.followUpStatus) && (
                                <div className="mb-1">
                                  <strong>Status:</strong>{" "}
                                  <Badge
                                    variant={getFollowUpStatusColor(
                                      act.meta?.followUpStatus ||
                                        act.metadata?.followUpStatus,
                                    )}
                                  >
                                    {act.meta?.followUpStatus ||
                                      act.metadata?.followUpStatus}
                                  </Badge>
                                </div>
                              )}
                              {(act.meta?.note || act.metadata?.note) && (
                                <div>
                                  <strong>Note:</strong>{" "}
                                  {act.meta?.note || act.metadata?.note}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default Tracking;
