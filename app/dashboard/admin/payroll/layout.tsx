import PayrollProtectionGate from "@/app/components/payroll/PayrollProtectionGate";

export const metadata = {
  title: "Payroll Processing | Admin Dashboard",
};

export default function AdminPayrollLayout({ children }: { children: React.ReactNode }) {
  return <PayrollProtectionGate>{children}</PayrollProtectionGate>;
}
