import employeeSalaryService from "../services/employeeSalaryService";

export const monthInputToLabel = (value) => {
  if (!value) return "";
  const [year, month] = String(value).split("-");
  if (!year || !month) return "";
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
};

export const monthLabelToInput = (label) => {
  if (!label) return "";
  const date = new Date(`1 ${label}`);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const computeAbsentDays = ({ totalWorkingDays, presentDays } = {}) => {
  const working = Number(totalWorkingDays) || 0;
  const present = Number(presentDays) || 0;
  return Math.max(0, working - present);
};

export const computePerDaySalary = ({ basicSalary, totalWorkingDays } = {}) => {
  const working = Number(totalWorkingDays) || 0;
  const basic = Number(basicSalary) || 0;
  if (working <= 0) return 0;
  return basic / working;
};

/** Leave deduction = absent days × (basic salary / total working days) */
export const computeLeaveDeduction = ({
  basicSalary,
  totalWorkingDays,
  presentDays,
} = {}) => {
  const absentDays = computeAbsentDays({ totalWorkingDays, presentDays });
  const perDaySalary = computePerDaySalary({ basicSalary, totalWorkingDays });
  return Math.round(absentDays * perDaySalary * 100) / 100;
};

export const computeSalaryPreview = (form) => {
  const totalEarnings =
    Number(form.basicSalary || 0) +
    Number(form.housingAllowance || 0) +
    Number(form.transport || 0) +
    Number(form.performanceBonus || 0);
  const leaveDeduction = computeLeaveDeduction(form);
  const totalDeduction =
    Number(form.professionalTax || 0) +
    Number(form.healthInsurance || 0) +
    Number(form.pensionContribution || 0) +
    leaveDeduction;
  return {
    totalEarnings,
    leaveDeduction,
    totalDeduction,
    netPay: totalEarnings - totalDeduction,
    absentDays: computeAbsentDays(form),
    perDaySalary: computePerDaySalary(form),
  };
};

export const downloadSalarySlipPdf = async (id, record = {}) => {
  const response = await employeeSalaryService.exportPdf(id);
  const blob = response?.data;
  if (!blob || !(blob instanceof Blob)) {
    throw new Error("Invalid PDF response");
  }

  const contentType = response?.headers?.["content-type"] || blob.type || "";
  if (blob.size < 100 || contentType.includes("json")) {
    const text = await blob.text();
    const err = text
      ? (() => {
          try {
            const j = JSON.parse(text);
            return j?.message || j?.error?.detail || text;
          } catch {
            return text;
          }
        })()
      : "Invalid PDF response";
    throw new Error(err);
  }

  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const snap = record.employeeSnapshot || {};
  const slug = (snap.idnumber || "employee").replace(/\s+/g, "-");
  const monthSlug = (record.month || "salary").replace(/\s+/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `salary-slip-${slug}-${monthSlug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
