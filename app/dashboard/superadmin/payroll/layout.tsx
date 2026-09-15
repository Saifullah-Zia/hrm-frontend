import PayrollProtectionGate from "@/app/components/payroll/PayrollProtectionGate";

export const metadata = {
  title: "Payroll & Reports | SuperAdmin Dashboard",
};

export default function SuperAdminPayrollLayout({ children }: { children: React.ReactNode }) {
  return <PayrollProtectionGate>{children}</PayrollProtectionGate>;
}
