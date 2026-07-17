import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudDownload, Pencil, Plus } from "lucide-react";
import employeeSalaryService from "../../services/employeeSalaryService";
import { Loader, PageHeader } from "../../components";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { toastError } from "../../utils/toast";
import { downloadSalarySlipPdf } from "../../utils/salarySlipPdf";
import { dateFormatter } from "../../utils/dateFormatter";

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const SalaryManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeSalaryService.getAll({
        pageSize: 100,
        month: monthFilter || undefined,
        search: search || undefined,
      });
      const data = res?.data?.data ?? res?.data ?? {};
      setRecords(data.employeeSalaries ?? []);
    } catch (err) {
      toastError(err?.message || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, search]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const monthOptions = useMemo(() => {
    const months = [...new Set(records.map((r) => r.month).filter(Boolean))];
    return months.sort((a, b) => new Date(`1 ${b}`) - new Date(`1 ${a}`));
  }, [records]);

  const handleDownload = async (record) => {
    const id = record._id || record.id;
    if (!id) return;
    setDownloadingId(id);
    try {
      await downloadSalarySlipPdf(id, record);
    } catch (err) {
      toastError(err?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Salary Management"
        description="Generate, review, and download employee salary slips."
        actions={
          <Button onClick={() => navigate("/salary-management/generate")}>
            <Plus className="h-4 w-4" />
            Generate Salary Slip
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Search employee name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="py-5 text-center">
              <Loader message="Loading salary slips..." />
            </div>
          ) : records.length === 0 ? (
            <p className="mb-0 text-sm text-muted-foreground">
              No salary slips generated yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const id = record._id || record.id;
                  const snap = record.employeeSnapshot || {};
                  return (
                    <TableRow key={id}>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>{snap.name || "—"}</TableCell>
                      <TableCell>{snap.idnumber || "—"}</TableCell>
                      <TableCell>
                        {dateFormatter(record.payDate, "—")}
                      </TableCell>
                      <TableCell>{formatAmount(record.netPay)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() =>
                              navigate(`/salary-management/edit/${id}`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Download PDF"
                            disabled={downloadingId === id}
                            onClick={() => handleDownload(record)}
                          >
                            <CloudDownload className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagement;
