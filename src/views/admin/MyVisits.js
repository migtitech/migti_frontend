import React, { useEffect, useState } from "react";
import visitService from "../../services/visitService";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError, toastSuccess } from "../../utils/toast";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const getTodayInputDate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const MY_VISITS_FILTER_DEFAULTS = {
  date: getTodayInputDate(),
  status: "active",
};

const MyVisits = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "my_visits",
    MY_VISITS_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(initialValues.date);
  const [activeTab, setActiveTab] = useState(initialValues.status);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const loadMyVisits = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await visitService.myList({
        pageNumber,
        pageSize: 10,
        dateFrom: selectedDate,
        dateTo: selectedDate,
        status: activeTab,
      });
      const payload = unwrapResponse(res);
      const data = payload?.data || payload || {};
      setRows(data?.visits || []);
      setPagination(
        data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        },
      );
    } catch (err) {
      toastError(err?.message || "Failed to load my visits");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyVisits(page);
  }, [page, selectedDate, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate, activeTab]);

  useFilterLockPersist("my_visits", filtersLocked, {
    date: selectedDate,
    status: activeTab,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      date: selectedDate,
      status: activeTab,
    });
  };

  const onOpenVisitView = (visit) => {
    setSelectedVisit(visit);
    setRemarkText(visit?.remark || "");
    setIsViewDrawerOpen(true);
  };

  const getWordCount = (text) =>
    String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const onSubmitRemark = async () => {
    if (!selectedVisit?._id) return;
    const words = getWordCount(remarkText);
    if (words < 20) {
      toastError("Remark must contain at least 20 words");
      return;
    }

    setSavingRemark(true);
    try {
      await visitService.completeWithRemark({
        visitId: selectedVisit._id,
        remark: remarkText,
      });
      toastSuccess("Remark saved and visit marked as completed");
      setIsViewDrawerOpen(false);
      setSelectedVisit(null);
      setRemarkText("");
      setActiveTab("completed");
      setPage(1);
      loadMyVisits(1);
    } catch (err) {
      toastError(err?.message || "Failed to save remark");
    } finally {
      setSavingRemark(false);
    }
  };

  return (
    <div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>My Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-12 md:items-end">
            <div className="space-y-1.5 md:col-span-4">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-4">
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant={activeTab === "active" ? "default" : "outline"}
                  className="w-1/2"
                  onClick={() => setActiveTab("active")}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "completed" ? "success" : "outline"}
                  className="w-1/2"
                  onClick={() => setActiveTab("completed")}
                >
                  Completed
                </Button>
              </div>
            </div>
            <div className="md:col-span-3">
              <Card>
                <CardContent className="py-3">
                  <div className="text-sm text-muted-foreground">
                    Total {activeTab === "active" ? "Active" : "Completed"}{" "}
                    Visits
                  </div>
                  <div className="text-lg font-semibold">
                    {pagination.totalItems || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex items-end md:col-span-1">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="My Visits"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader message="Loading my visits..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.length > 0 ? (
                rows.map((visit) => (
                  <button
                    key={visit._id}
                    type="button"
                    className="h-full rounded-lg border border-border p-4 text-left transition-shadow hover:shadow-md"
                    onClick={() => onOpenVisitView(visit)}
                  >
                    <div className="mb-1">
                      <Badge
                        variant={
                          visit.status === "completed" ? "success" : "default"
                        }
                      >
                        {visit.status === "completed" ? "Completed" : "Active"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Industry
                    </div>
                    <div className="mb-1">
                      {visit.industries?.[0]?.name || "-"}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Instructions
                    </div>
                    <div
                      className="mb-1 truncate"
                      title={visit.instructions || "-"}
                    >
                      {visit.instructions || "-"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-muted-foreground">
                  No visits found for your login.
                </div>
              )}
            </div>
          )}

          <TablePagination
            currentPage={pagination?.currentPage ?? 1}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            showRange
            totalItems={pagination?.totalItems ?? 0}
            itemsPerPage={pagination?.itemsPerPage ?? 10}
          />
        </CardContent>
      </Card>

      <Sheet open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>My Visit Details</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="mb-2">
              <Badge
                variant={
                  selectedVisit?.status === "completed" ? "success" : "default"
                }
              >
                {selectedVisit?.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">Zone</div>
            <div className="mb-2">{selectedVisit?.zoneName || "-"}</div>

            <div className="text-sm text-muted-foreground">Industry</div>
            <div className="mb-2">
              {selectedVisit?.industries?.[0]?.name || "-"}
            </div>

            <div className="text-sm text-muted-foreground">Instructions</div>
            <div className="mb-2">{selectedVisit?.instructions || "-"}</div>

            <div className="text-sm text-muted-foreground">
              Remark (minimum 20 words)
            </div>
            <Textarea
              rows={5}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Write detailed remark with minimum 20 words…"
              disabled={selectedVisit?.status === "completed"}
            />
            <div className="mb-2 mt-1 text-sm text-muted-foreground">
              Words: {getWordCount(remarkText)}
            </div>

            {selectedVisit?.status !== "completed" ? (
              <Button
                type="button"
                variant="success"
                disabled={savingRemark}
                onClick={onSubmitRemark}
              >
                {savingRemark ? "Saving..." : "Save Remark & Complete"}
              </Button>
            ) : (
              <div className="text-sm text-success!">
                This visit is already completed.
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MyVisits;
