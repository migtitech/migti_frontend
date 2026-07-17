import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CloudDownload } from "lucide-react";
import employeeService from "../../services/employeeService";
import employeeSalaryService from "../../services/employeeSalaryService";
import { Loader, PageHeader } from "../../components";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  computeLeaveDeduction,
  computeSalaryPreview,
  downloadSalarySlipPdf,
  monthInputToLabel,
  monthLabelToInput,
} from "../../utils/salarySlipPdf";

const PAYMENT_MODES = ["Bank Transfer", "Cash", "Cheque", "UPI"];

const emptyForm = () => ({
  employeeId: "",
  monthInput: "",
  month: "",
  payDate: "",
  totalWorkingDays: "",
  presentDays: "",
  name: "",
  idnumber: "",
  designation: "",
  department: "",
  email: "",
  companyEmail: "",
  basicSalary: "",
  housingAllowance: "0",
  transport: "0",
  performanceBonus: "0",
  professionalTax: "0",
  healthInsurance: "0",
  pensionContribution: "0",
  bankAccountNumber: "",
  paymentMode: "Bank Transfer",
});

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const SalarySlipForm = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm());

  const totals = useMemo(() => computeSalaryPreview(form), [form]);

  const loadEmployees = useCallback(async () => {
    const merged = [];
    const pageSize = 100;
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const params = { pageNumber, pageSize };
      const res = await employeeService.getAll(params);
      const data = res?.data?.data ?? res?.data ?? {};
      const list = data.employees ?? [];
      merged.push(...list);
      if (list.length < pageSize) hasMore = false;
      else pageNumber += 1;
    }

    setEmployees(merged);
  }, []);

  const loadRecord = useCallback(async () => {
    if (!editId) return;
    const res = await employeeSalaryService.getById(editId);
    const record = res?.data?.data ?? res?.data ?? {};
    const snap = record.employeeSnapshot || {};
    setForm({
      employeeId: String(record.employeeId?._id || record.employeeId || ""),
      monthInput: monthLabelToInput(record.month),
      month: record.month || "",
      payDate: record.payDate
        ? new Date(record.payDate).toISOString().slice(0, 10)
        : "",
      totalWorkingDays: String(record.totalWorkingDays ?? ""),
      presentDays: String(record.presentDays ?? ""),
      name: snap.name || "",
      idnumber: snap.idnumber || "",
      designation: snap.designation || "",
      department: snap.department || "",
      email: snap.email || "",
      companyEmail: snap.companyEmail || "",
      basicSalary: String(record.basicSalary ?? ""),
      housingAllowance: String(record.housingAllowance ?? 0),
      transport: String(record.transport ?? 0),
      performanceBonus: String(record.performanceBonus ?? 0),
      professionalTax: String(record.professionalTax ?? 0),
      healthInsurance: String(record.healthInsurance ?? 0),
      pensionContribution: String(record.pensionContribution ?? 0),
      bankAccountNumber: record.bankAccountNumber || "",
      paymentMode: record.paymentMode || "Bank Transfer",
    });
  }, [editId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadEmployees();
        if (isEdit) await loadRecord();
      } catch (err) {
        toastError(err?.message || "Failed to load form data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isEdit, loadEmployees, loadRecord]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "monthInput") {
        next.month = monthInputToLabel(value);
      }
      return next;
    });
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(
      (e) => String(e._id || e.id) === String(employeeId),
    );
    if (!employee) {
      handleChange("employeeId", employeeId);
      return;
    }
    setForm((prev) => ({
      ...prev,
      employeeId,
      name: employee.name || "",
      idnumber: employee.idnumber || "",
      designation: employee.designation || "",
      email: employee.email || "",
      companyEmail: employee.companyEmail || "",
      basicSalary: String(employee.salary ?? ""),
      bankAccountNumber: employee.bankDetails?.accountNumber || "",
      paymentMode: prev.paymentMode || "Bank Transfer",
    }));
  };

  const buildPayload = () => ({
    employeeId: form.employeeId,
    month: form.month,
    payDate: form.payDate,
    totalWorkingDays: Number(form.totalWorkingDays) || 0,
    presentDays: Number(form.presentDays) || 0,
    basicSalary: Number(form.basicSalary) || 0,
    housingAllowance: Number(form.housingAllowance) || 0,
    transport: Number(form.transport) || 0,
    performanceBonus: Number(form.performanceBonus) || 0,
    professionalTax: Number(form.professionalTax) || 0,
    healthInsurance: Number(form.healthInsurance) || 0,
    pensionContribution: Number(form.pensionContribution) || 0,
    leaveDeduction: computeLeaveDeduction(form),
    bankAccountNumber: form.bankAccountNumber,
    paymentMode: form.paymentMode,
    employeeSnapshot: {
      name: form.name,
      idnumber: form.idnumber,
      designation: form.designation,
      department: form.department,
      email: form.email,
      companyEmail: form.companyEmail,
    },
  });

  const handleSubmit = async (downloadAfter = false) => {
    if (!form.employeeId) {
      toastError("Please select an employee");
      return;
    }
    if (!form.month) {
      toastError("Please select a month");
      return;
    }
    if (!form.payDate) {
      toastError("Please select pay date");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      let saved;
      if (isEdit) {
        const res = await employeeSalaryService.update(editId, payload);
        saved = res?.data?.data ?? res?.data ?? {};
        toastSuccess("Salary slip updated successfully");
      } else {
        const res = await employeeSalaryService.create(payload);
        saved = res?.data?.data ?? res?.data ?? {};
        toastSuccess("Salary slip generated successfully");
      }

      if (downloadAfter) {
        const savedId = saved._id || saved.id || editId;
        await downloadSalarySlipPdf(savedId, saved);
      }

      navigate("/salary-management");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save salary slip";
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-5 text-center">
        <Loader message="Loading..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/salary-management")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Salary Management
        </Button>
      </div>

      <PageHeader
        title={isEdit ? "Edit Salary Slip" : "Generate Salary Slip"}
        description="Capture attendance, earnings, and deductions to compute net pay."
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-6">
                <Label>Employee *</Label>
                <Select
                  value={form.employeeId}
                  disabled={isEdit}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} ({emp.designation})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Month *</Label>
                <Input
                  type="month"
                  value={form.monthInput}
                  onChange={(e) => handleChange("monthInput", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Pay Date *</Label>
                <Input
                  type="date"
                  value={form.payDate}
                  onChange={(e) => handleChange("payDate", e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label>Employee Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Employee ID</Label>
                <Input
                  value={form.idnumber}
                  onChange={(e) => handleChange("idnumber", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-6">
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-6">
                <Label>Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onChange={(e) => handleChange("paymentMode", e.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-12">
                <h6 className="mt-2 text-sm font-semibold text-foreground">
                  Attendance
                </h6>
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Total Working Days</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalWorkingDays}
                  onChange={(e) =>
                    handleChange("totalWorkingDays", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Present Days</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.presentDays}
                  onChange={(e) => handleChange("presentDays", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Absent Days</Label>
                <Input value={totals.absentDays} disabled readOnly />
              </div>
              <div className="md:col-span-12">
                <div className="text-sm text-muted-foreground">
                  Per day salary: {formatAmount(totals.perDaySalary)} (Basic
                  salary ÷ total working days)
                </div>
              </div>

              <div className="md:col-span-12">
                <h6 className="mt-2 text-sm font-semibold text-foreground">
                  Earnings
                </h6>
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Basic Salary *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basicSalary}
                  onChange={(e) => handleChange("basicSalary", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Housing Allowance</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.housingAllowance}
                  onChange={(e) =>
                    handleChange("housingAllowance", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Transport</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.transport}
                  onChange={(e) => handleChange("transport", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Performance Bonus</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.performanceBonus}
                  onChange={(e) =>
                    handleChange("performanceBonus", e.target.value)
                  }
                />
              </div>

              <div className="md:col-span-12">
                <h6 className="mt-2 text-sm font-semibold text-foreground">
                  Deductions
                </h6>
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Professional Tax</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.professionalTax}
                  onChange={(e) =>
                    handleChange("professionalTax", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Health Insurance</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.healthInsurance}
                  onChange={(e) =>
                    handleChange("healthInsurance", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Pension Contribution</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pensionContribution}
                  onChange={(e) =>
                    handleChange("pensionContribution", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Leave Deduction</Label>
                <Input
                  type="number"
                  value={totals.leaveDeduction}
                  disabled
                  readOnly
                />
                <div className="mt-1 text-sm text-muted-foreground">
                  {totals.absentDays} absent day
                  {totals.absentDays === 1 ? "" : "s"} ×{" "}
                  {formatAmount(totals.perDaySalary)}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-6">
                <Label>Bank Account Number</Label>
                <Input
                  value={form.bankAccountNumber}
                  onChange={(e) =>
                    handleChange("bankAccountNumber", e.target.value)
                  }
                />
              </div>

              <div className="md:col-span-12">
                <div className="rounded-lg border border-border bg-muted p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Total Earnings
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatAmount(totals.totalEarnings)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Total Deductions
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatAmount(totals.totalDeduction)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Net Pay
                      </div>
                      <div className="text-lg font-bold text-primary!">
                        {formatAmount(totals.netPay)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-12">
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                >
                  {isEdit ? "Update" : "Generate"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                >
                  <CloudDownload className="h-4 w-4" />
                  {isEdit ? "Update & Download PDF" : "Generate & Download PDF"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/salary-management")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalarySlipForm;
