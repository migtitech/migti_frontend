import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilCloudDownload } from "@coreui/icons";
import employeeService from "../../services/employeeService";
import employeeSalaryService from "../../services/employeeSalaryService";
import useBranchContext from "../../hooks/useBranchContext";
import { Loader } from "../../components";
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
  const { branchId: userBranchId } = useBranchContext();

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
      if (userBranchId) params.branchId = userBranchId;
      const res = await employeeService.getAll(params);
      const data = res?.data?.data ?? res?.data ?? {};
      const list = data.employees ?? [];
      merged.push(...list);
      if (list.length < pageSize) hasMore = false;
      else pageNumber += 1;
    }

    setEmployees(merged);
  }, [userBranchId]);

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
      <div className="text-center py-5">
        <Loader message="Loading..." />
      </div>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center gap-2">
            <CButton
              color="light"
              size="sm"
              onClick={() => navigate("/salary-management")}
            >
              <CIcon icon={cilArrowLeft} />
            </CButton>
            <strong>
              {isEdit ? "Edit Salary Slip" : "Generate Salary Slip"}
            </strong>
          </CCardHeader>
          <CCardBody>
            <CForm>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Employee *</CFormLabel>
                  <CFormSelect
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
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Month *</CFormLabel>
                  <CFormInput
                    type="month"
                    value={form.monthInput}
                    onChange={(e) => handleChange("monthInput", e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Pay Date *</CFormLabel>
                  <CFormInput
                    type="date"
                    value={form.payDate}
                    onChange={(e) => handleChange("payDate", e.target.value)}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel>Employee Name</CFormLabel>
                  <CFormInput
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Employee ID</CFormLabel>
                  <CFormInput
                    value={form.idnumber}
                    onChange={(e) => handleChange("idnumber", e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Department</CFormLabel>
                  <CFormInput
                    value={form.department}
                    onChange={(e) => handleChange("department", e.target.value)}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Designation</CFormLabel>
                  <CFormInput
                    value={form.designation}
                    onChange={(e) =>
                      handleChange("designation", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Payment Mode</CFormLabel>
                  <CFormSelect
                    value={form.paymentMode}
                    onChange={(e) =>
                      handleChange("paymentMode", e.target.value)
                    }
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol md={12}>
                  <h6 className="mt-2">Attendance</h6>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Total Working Days</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="1"
                    value={form.totalWorkingDays}
                    onChange={(e) =>
                      handleChange("totalWorkingDays", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Present Days</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="1"
                    value={form.presentDays}
                    onChange={(e) =>
                      handleChange("presentDays", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Absent Days</CFormLabel>
                  <CFormInput value={totals.absentDays} disabled readOnly />
                </CCol>
                <CCol md={12}>
                  <div className="text-muted small">
                    Per day salary: {formatAmount(totals.perDaySalary)} (Basic
                    salary ÷ total working days)
                  </div>
                </CCol>

                <CCol md={12}>
                  <h6 className="mt-2">Earnings</h6>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Basic Salary *</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basicSalary}
                    onChange={(e) =>
                      handleChange("basicSalary", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Housing Allowance</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.housingAllowance}
                    onChange={(e) =>
                      handleChange("housingAllowance", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Transport</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.transport}
                    onChange={(e) => handleChange("transport", e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Performance Bonus</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.performanceBonus}
                    onChange={(e) =>
                      handleChange("performanceBonus", e.target.value)
                    }
                  />
                </CCol>

                <CCol md={12}>
                  <h6 className="mt-2">Deductions</h6>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Professional Tax</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.professionalTax}
                    onChange={(e) =>
                      handleChange("professionalTax", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Health Insurance</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.healthInsurance}
                    onChange={(e) =>
                      handleChange("healthInsurance", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Pension Contribution</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.pensionContribution}
                    onChange={(e) =>
                      handleChange("pensionContribution", e.target.value)
                    }
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Leave Deduction</CFormLabel>
                  <CFormInput
                    type="number"
                    value={totals.leaveDeduction}
                    disabled
                    readOnly
                  />
                  <div className="text-muted small mt-1">
                    {totals.absentDays} absent day
                    {totals.absentDays === 1 ? "" : "s"} ×{" "}
                    {formatAmount(totals.perDaySalary)}
                  </div>
                </CCol>

                <CCol md={6}>
                  <CFormLabel>Bank Account Number</CFormLabel>
                  <CFormInput
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      handleChange("bankAccountNumber", e.target.value)
                    }
                  />
                </CCol>

                <CCol md={12}>
                  <CCard className="bg-light border-0">
                    <CCardBody>
                      <CRow>
                        <CCol md={4}>
                          <div className="text-muted small">Total Earnings</div>
                          <div className="fw-semibold">
                            {formatAmount(totals.totalEarnings)}
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="text-muted small">
                            Total Deductions
                          </div>
                          <div className="fw-semibold">
                            {formatAmount(totals.totalDeduction)}
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="text-muted small">Net Pay</div>
                          <div className="fw-bold text-primary fs-5">
                            {formatAmount(totals.netPay)}
                          </div>
                        </CCol>
                      </CRow>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={12} className="d-flex gap-2 flex-wrap">
                  <CButton
                    color="primary"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                  >
                    {isEdit ? "Update" : "Generate"}
                  </CButton>
                  <CButton
                    color="success"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSubmit(true)}
                  >
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    {isEdit
                      ? "Update & Download PDF"
                      : "Generate & Download PDF"}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="ghost"
                    onClick={() => navigate("/salary-management")}
                  >
                    Cancel
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default SalarySlipForm;
