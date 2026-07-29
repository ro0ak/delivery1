import type { UserRole } from "../contexts/AuthContext";

export function getRoleHome(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/company";

    case "branch_manager":
      return "/branch";

    case "driver":
      return "/staff/delivery";

    case "branch_employee":
    case "operations":
      return "/staff/work-mode";

    case "accountant":
      return "/branch";

    default:
      return "/staff/work-mode";
  }
}
