import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CloudDownload } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { Loader, PageHeader } from "../../components";
import employeeSalaryService from "../../services/employeeSalaryService";
import { toastError } from "../../utils/toast";
import { downloadSalarySlipPdf } from "../../utils/salarySlipPdf";
import { dateFormatter } from "../../utils/dateFormatter";

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MySalary = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeSalaryService.getAll({
        pageSize: 100,
        month: monthFilter || undefined,
      });
      const data = res?.data?.data ?? res?.data ?? {};
      setRecords(data.employeeSalaries ?? []);
    } catch (err) {
      toastError(err?.message || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

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
        title="My Salary"
        description="View and download your monthly salary slips."
      />
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 max-w-xs">
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
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader message="Loading your salary slips..." />
            </div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No salary slips available yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Month</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const id = record._id || record.id;
                    return (
                      <TableRow key={id}>
                        <TableCell>{record.month}</TableCell>
                        <TableCell>
                          {dateFormatter(record.payDate, "—")}
                        </TableCell>
                        <TableCell>{formatAmount(record.netPay)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            title="Download salary slip"
                            disabled={downloadingId === id}
                            onClick={() => handleDownload(record)}
                          >
                            <CloudDownload className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MySalary;
