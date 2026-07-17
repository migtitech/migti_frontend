import React from "react";
import { TablePagination } from "..";
import { User, Clock, Mail, Phone, Pencil, Check } from "lucide-react";
import { Card, CardContent, CardHeader, Badge, Spinner } from "../ui";
import EyeIcon from "../EyeIcon";
import { dateTimeFormatter } from "../../utils/dateFormatter";

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

const getActivityCircleClass = (type) => {
  switch (type) {
    case "viewed":
      return "bg-primary!";
    case "action":
      return "bg-warning!";
    case "follow_up":
      return "bg-success!";
    default:
      return "bg-secondary!";
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

const getTimestamp = (act) =>
  act.createdAt || act.created_at || act.timestamp || null;

/**
 * Reusable Tracking Timeline - same as Tracking page.
 * @param {Object} query - { createdAt, created_at }
 * @param {Array} activities - list of activities
 * @param {Object} pagination - { currentPage, totalPages, totalItems, hasPrevPage, hasNextPage }
 * @param {boolean} loading
 * @param {Function} onLoadPage - (page) => void
 * @param {Object} creator - { name, email, role }
 * @param {Function} getPerformerInfo - (act) => ({ name, email, phone, role })
 * @param {React.ReactNode} headerActions - optional buttons for header (Action, Follow-up)
 */
const TrackingTimeline = ({
  query,
  activities = [],
  pagination = null,
  loading = false,
  onLoadPage,
  creator,
  getPerformerInfo,
  headerActions,
}) => {
  const totalItems = pagination?.totalItems ?? activities.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? 1;

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <strong>Tracking Timeline</strong>
        <div className="flex items-center gap-2">
          {headerActions}
          <Badge variant="default">
            {totalItems} {totalItems === 1 ? "activity" : "activities"}
          </Badge>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onLoadPage}
            disabled={loading}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Created entry */}
        <div className="mb-3 flex items-start border-b pb-3">
          <div
            className="mr-3 flex items-center justify-center rounded-full bg-primary!"
            style={{ width: 40, height: 40, minWidth: 40 }}
          >
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Created</Badge>
              <span className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {dateTimeFormatter(query?.createdAt || query?.created_at, "-")}
              </span>
            </div>
            <div className="mt-1">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold">
                  {(creator && (creator.name || creator.email)) || "—"}
                </span>
                {creator?.role && (
                  <Badge variant="outline" className="ml-1">
                    {creator.role}
                  </Badge>
                )}
              </div>
              {creator?.email && (
                <div className="ml-3 text-xs text-muted-foreground">
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  {creator.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Spinner size="sm" className="mr-2" />
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            <Clock className="mx-auto mb-2 block h-6 w-6" />
            No tracking activities recorded yet.
          </div>
        ) : (
          activities.map((act, index) => {
            const performer = getPerformerInfo
              ? getPerformerInfo(act)
              : { name: null, email: null, phone: null, role: null };
            const timestamp = getTimestamp(act);
            const isLast = index === activities.length - 1;
            const ActivityIcon = getActivityIcon(act.type);
            return (
              <div
                key={act._id || act.id || index}
                className={`mb-3 flex items-start ${!isLast ? "border-b pb-3" : ""}`}
              >
                <div
                  className={`mr-3 flex items-center justify-center rounded-full ${getActivityCircleClass(act.type)}`}
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
                      <ActivityIcon className="h-5 w-5 text-white" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getActivityBadgeColor(act.type)}>
                      {getActivityLabel(act.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3.5 w-3.5" />
                      {dateTimeFormatter(timestamp, "-")}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">
                        {performer?.name || act.performByName || "—"}
                      </span>
                      {performer?.role && (
                        <Badge variant="outline">{performer.role}</Badge>
                      )}
                    </div>
                    {performer?.email && (
                      <div className="ml-4 text-xs text-muted-foreground">
                        <Mail className="mr-1 inline h-3.5 w-3.5" />
                        {performer.email}
                      </div>
                    )}
                    {performer?.phone && (
                      <div className="ml-4 text-xs text-muted-foreground">
                        <Phone className="mr-1 inline h-3.5 w-3.5" />
                        {performer.phone}
                      </div>
                    )}
                  </div>

                  {act.type === "action" &&
                    (act.meta?.action || act.metadata?.action) && (
                      <div className="mt-2 rounded bg-muted p-2 text-xs">
                        <strong>Action:</strong>{" "}
                        {act.meta?.action || act.metadata?.action}
                      </div>
                    )}

                  {act.type === "follow_up" && (
                    <div className="mt-2 rounded bg-muted p-2 text-xs">
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
  );
};

export default TrackingTimeline;
