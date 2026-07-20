import React, { useCallback, useEffect, useState } from "react";
import { TablePagination } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "../../components/ui";
import employeeLocationService from "../../services/employeeLocationService";
import { toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const EmployeeLocations = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState({
    visible: false,
    employee: null,
  });
  const [historyRows, setHistoryRows] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeLocationService.getTeamLatest();
      const list = res?.data?.employees || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toastError(err?.message || "Failed to load team locations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const loadHistory = useCallback(async (employeeId, page) => {
    if (!employeeId) return;
    setHistoryLoading(true);
    try {
      const res = await employeeLocationService.getHistoryBinned({
        employeeId,
        pageNumber: page,
        pageSize: 10,
        intervalMinutes: 30,
      });
      setHistoryRows(res?.data?.locations || []);
      setHistoryPagination(res?.data?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load location history");
      setHistoryRows([]);
      setHistoryPagination(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (employee) => {
    setHistoryModal({ visible: true, employee });
    setHistoryPage(1);
  };

  const closeHistory = () => {
    setHistoryModal({ visible: false, employee: null });
    setHistoryRows([]);
    setHistoryPagination(null);
  };

  useEffect(() => {
    if (!historyModal.visible || !historyModal.employee) return;
    const id = historyModal.employee.employeeId || historyModal.employee._id;
    loadHistory(id, historyPage);
  }, [historyPage, historyModal.visible, historyModal.employee, loadHistory]);

  const totalHistoryPages = historyPagination?.totalPages || 1;
  const currentHistoryPage = historyPagination?.currentPage || historyPage;

  return (
    <div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Employee locations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last reported position per employee. History uses one checkpoint per
            30-minute window (latest reading in each window).
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="mb-0">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Name</TableHead>
                    <TableHead scope="col">Latitude</TableHead>
                    <TableHead scope="col">Longitude</TableHead>
                    <TableHead scope="col">City</TableHead>
                    <TableHead scope="col">Locality</TableHead>
                    <TableHead scope="col">Last fetched</TableHead>
                    <TableHead scope="col" className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const loc = row.lastLocation;
                      const id = row.employeeId || row._id;
                      return (
                        <TableRow key={String(id)}>
                          <TableCell>{row.name || "—"}</TableCell>
                          <TableCell>
                            {loc?.latitude != null
                              ? Number(loc.latitude).toFixed(6)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {loc?.longitude != null
                              ? Number(loc.longitude).toFixed(6)
                              : "—"}
                          </TableCell>
                          <TableCell>{loc?.city || "—"}</TableCell>
                          <TableCell>{loc?.locality || "—"}</TableCell>
                          <TableCell>
                            {dateTimeFormatter(loc?.fetchedAt, "—")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openHistory({ ...row, employeeId: id })
                              }
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={historyModal.visible}
        onOpenChange={(o) => !o && closeHistory()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Location History
              {historyModal.employee?.name ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  — {historyModal.employee.name}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="mb-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Latitude</TableHead>
                        <TableHead scope="col">Longitude</TableHead>
                        <TableHead scope="col">City</TableHead>
                        <TableHead scope="col">Locality</TableHead>
                        <TableHead scope="col">Date &amp; time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No history for this employee yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        historyRows.map((h) => (
                          <TableRow key={String(h._id)}>
                            <TableCell>
                              {h.latitude != null
                                ? Number(h.latitude).toFixed(6)
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {h.longitude != null
                                ? Number(h.longitude).toFixed(6)
                                : "—"}
                            </TableCell>
                            <TableCell>{h.city || "—"}</TableCell>
                            <TableCell>{h.locality || "—"}</TableCell>
                            <TableCell>
                              {dateTimeFormatter(h.fetchedAt, "—")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  currentPage={currentHistoryPage}
                  totalPages={totalHistoryPages}
                  onPageChange={setHistoryPage}
                  showRange
                  totalItems={historyPagination?.totalItems ?? 0}
                  itemsPerPage={historyPagination?.itemsPerPage ?? 10}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeHistory}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLocations;
