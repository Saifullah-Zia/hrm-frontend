"use client";

import { useState } from "react";
import { payrollApi, PayrollDTO } from "@/services/payrollApi";
import { openPayslipPrintView } from "@/lib/payslipExport";

const fmtMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface PayslipModalProps {
  payroll: PayrollDTO | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackEmployeeName?: string;
}

export default function PayslipModal({
  payroll,
  isOpen,
  onClose,
  fallbackEmployeeName,
}: PayslipModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !payroll) return null;

  const employeeName = payroll.userName || fallbackEmployeeName || `Employee ${payroll.userId}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const downloaded = await payrollApi.downloadPayslipPdf(payroll.id);
      if (!downloaded) {
        openPayslipPrintView(payroll, employeeName);
      }
    } catch {
      openPayslipPrintView(payroll, employeeName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto my-auto text-gray-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Payslip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg p-1 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Employee Information */}
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 text-sm">Employee Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{employeeName}</span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 text-sm">Attendance Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Working Days:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.workingDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Present Days:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.presentDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Late Days:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.lateDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Paid Leave:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.paidLeaveDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Unpaid Leave:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.unpaidLeaveDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Absent Days:</span>
                <span className="ml-2 font-medium text-gray-900">{payroll.absentDays || 0}</span>
              </div>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 text-sm">Salary Breakdown</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Basic Salary:</span>
                <span className="font-medium">PKR {fmtMoney(payroll.basicSalary || payroll.salary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Salary:</span>
                <span className="font-medium">PKR {fmtMoney(payroll.dailySalary || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Allowances:</span>
                <span className="font-medium">PKR {fmtMoney(payroll.totalAllowances || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Bonuses:</span>
                <span className="font-medium">PKR {fmtMoney(payroll.totalBonuses || payroll.bonuses)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="text-gray-500">Total Deductions:</span>
                <span className="font-medium">- PKR {fmtMoney(payroll.totalDeductions || payroll.deductions)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-gray-900">
                <span>Gross Salary:</span>
                <span>PKR {fmtMoney(payroll.grossSalary || payroll.salary)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1">
                <span className="text-gray-900">Net Salary:</span>
                <span className="text-emerald-600">PKR {fmtMoney(payroll.netSalary)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 text-sm">Payment Status</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  payroll.status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                  payroll.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
                }`}>
                  {payroll.status || "DRAFT"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Generated At:</span>
                <span className="font-medium">{payroll.generatedAt ? new Date(payroll.generatedAt).toLocaleString() : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approved At:</span>
                <span className="font-medium">{payroll.approvedAt ? new Date(payroll.approvedAt).toLocaleString() : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid At:</span>
                <span className="font-medium">{payroll.paidAt ? new Date(payroll.paidAt).toLocaleString() : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                "Download PDF"
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
