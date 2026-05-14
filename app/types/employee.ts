import type { EmployeeProfileDto as Dto } from "@/services/employeeProfileApi";

export type { EmployeeProfileDto } from "@/services/employeeProfileApi";

export type EmploymentStatus = NonNullable<Dto["employmentStatus"]>;
