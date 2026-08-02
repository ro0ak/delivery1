import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import ConfirmationDialog from "../components/erp/ConfirmationDialog";
import TablePagination from "../components/erp/TablePagination";
import { useAuth, type UserRole } from "../contexts/AuthContext";
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  paginateRows,
} from "../lib/erp";
import { createStaffUser } from "../lib/staffProvisioning";
import { supabase } from "../../utils/supabase";

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
}

interface EmployeeFormState {
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  role: UserRole;
  branchId: string;
  isActive: boolean;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "branch_manager", label: "Branch Manager" },
  { value: "branch_employee", label: "Branch Employee" },
  { value: "operations", label: "Operations" },
  { value: "accountant", label: "Accountant" },
  { value: "super_admin", label: "Super Admin" },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  branch_manager: "Branch Manager",
  branch_employee: "Branch Employee",
  operations: "Operations",
  driver: "Driver",
  accountant: "Accountant",
};

const emptyForm: EmployeeFormState = {
  fullName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
  role: "branch_employee",
  branchId: "",
  isActive: true,
};

function normalizeRole(value: string): UserRole {
  const allowedRoles = roleOptions.map((option) => option.value);
  return allowedRoles.includes(value as UserRole)
    ? (value as UserRole)
    : "branch_employee";
}

export default function EmployeesPage() {
  const { profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const availableRoleOptions = useMemo(() => {
    if (profile?.role === "super_admin") {
      return roleOptions;
    }

    return roleOptions.filter((option) =>
      ["branch_employee", "operations"].includes(option.value),
    );
  }, [profile?.role]);

  const formRoleOptions = useMemo(() => {
    if (!editingEmployee) {
      return availableRoleOptions;
    }

    const currentRoleOption = roleOptions.find(
      (option) => option.value === editingEmployee.role,
    );

    if (
      currentRoleOption &&
      !availableRoleOptions.some(
        (option) => option.value === currentRoleOption.value,
      )
    ) {
      return [currentRoleOption, ...availableRoleOptions];
    }

    return availableRoleOptions;
  }, [availableRoleOptions, editingEmployee]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [branchesResponse, employeesResponse] = await Promise.all([
        supabase.from("branches").select("id,code,name").order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id,full_name,email,phone,role,branch_id,is_active")
          .in("role", roleOptions.map((role) => role.value))
          .order("full_name", { ascending: true }),
      ]);

      if (branchesResponse.error) {
        throw branchesResponse.error;
      }

      if (employeesResponse.error) {
        throw employeesResponse.error;
      }

      setBranches((branchesResponse.data || []) as BranchOption[]);
      setEmployees(
        (employeesResponse.data || []).map((row) => ({
          id: String(row.id),
          full_name: String((row as { full_name?: unknown }).full_name || "Unnamed Employee"),
          email: String((row as { email?: unknown }).email || ""),
          phone: ((row as { phone?: string | null }).phone || null) as string | null,
          role: normalizeRole(String((row as { role?: unknown }).role || "branch_employee")),
          branch_id: ((row as { branch_id?: string | null }).branch_id || null) as string | null,
          is_active: Boolean((row as { is_active?: unknown }).is_active),
        })),
      );
    } catch (error) {
      console.error("Failed to load employees page:", error);
      setErrorMessage(
        error instanceof Error
          ? `Failed to load employees data: ${error.message}`
          : "Failed to load employees data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Employees | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, searchQuery, statusFilter]);

  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);

  const visibleEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (branchFilter !== "all" && employee.branch_id !== branchFilter) {
        return false;
      }

      if (statusFilter === "active" && !employee.is_active) {
        return false;
      }

      if (statusFilter === "inactive" && employee.is_active) {
        return false;
      }

      return matchesSearch([employee.full_name, employee.email, employee.phone], searchQuery);
    });
  }, [branchFilter, employees, searchQuery, statusFilter]);

  const paginated = useMemo(
    () => paginateRows(visibleEmployees, page, pageSize),
    [page, pageSize, visibleEmployees],
  );

  const statistics = useMemo(
    () => ({
      total: visibleEmployees.length,
      managers: visibleEmployees.filter((employee) => employee.role === "branch_manager").length,
      active: visibleEmployees.filter((employee) => employee.is_active).length,
    }),
    [visibleEmployees],
  );

  function openCreateForm() {
    setEditingEmployee(null);
    setForm({
      ...emptyForm,
      role: availableRoleOptions[0]?.value || "branch_employee",
      branchId: profile?.role === "branch_manager" ? profile.branchId || "" : "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  }

  function openEditForm(employee: EmployeeRow) {
    setEditingEmployee(employee);
    setForm({
      fullName: employee.full_name,
      email: employee.email,
      phone: employee.phone || "",
      temporaryPassword: "",
      role: employee.role,
      branchId: employee.branch_id || "",
      isActive: employee.is_active,
    });
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingEmployee(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const temporaryPassword = form.temporaryPassword.trim();

    if (!fullName || !email) {
      setErrorMessage("Full name and email are required.");
      return;
    }

    if (!editingEmployee && !temporaryPassword) {
      setErrorMessage("Temporary password is required.");
      return;
    }

    if (profile?.role === "branch_manager" && profile.branchId && form.branchId !== profile.branchId) {
      setErrorMessage("Branch managers can only assign employees to their own branch.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        full_name: fullName,
        email,
        phone: phone || null,
        role: form.role,
        branch_id: form.branchId || null,
        is_active: form.isActive,
      };

      if (editingEmployee) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", editingEmployee.id);

        if (error) {
          throw error;
        }

        setSuccessMessage("Employee updated successfully.");
      } else {
        const response = await createStaffUser({
          email,
          temporaryPassword,
          fullName,
          phone,
          role: form.role,
          branchId: form.branchId || null,
          isActive: form.isActive,
        });

        setSuccessMessage(
          response.message || "Employee account created successfully.",
        );
      }

      closeForm();
      await loadData();
      await refreshProfile();
    } catch (error) {
      console.error("Failed to save employee:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save employee.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteEmployee() {
    if (!employeeToDelete || deletingId) {
      return;
    }

    setDeletingId(employeeToDelete.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", employeeToDelete.id);

      if (error) {
        throw error;
      }

      setEmployees((current) => current.filter((employee) => employee.id !== employeeToDelete.id));
      setSuccessMessage("Employee deleted successfully.");
      setEmployeeToDelete(null);
      await refreshProfile();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to delete employee: ${error.message}` : "Failed to delete employee.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Team Management
            </span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">Employees Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage live employee profiles, branch assignments, status, and permissions.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Users size={19} />
          </div>
          <p className="text-sm text-gray-500">Visible Staff</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{statistics.total}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Briefcase size={19} />
          </div>
          <p className="text-sm text-gray-500">Branch Managers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{statistics.managers}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <UserCog size={19} />
          </div>
          <p className="text-sm text-gray-500">Active Employees</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{statistics.active}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or phone"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none transition focus:border-red-600 focus:bg-white"
            />
          </label>

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
            disabled={profile?.role === "branch_manager"}
          >
            <option value="all">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading employees...
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
            <Users className="text-gray-300" size={36} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">No employees found</h2>
              <p className="mt-1 text-sm text-gray-500">Try changing the filters or link a new Supabase user.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((employee) => (
                <article key={employee.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{employee.full_name}</p>
                      <p className="text-xs text-gray-500">{employee.email}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        employee.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-3">
                      <dt>Role</dt>
                      <dd className="font-medium text-gray-900">{roleLabels[employee.role]}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Branch</dt>
                      <dd className="font-medium text-gray-900">
                        {employee.branch_id ? branchMap.get(employee.branch_id) || "Unknown" : "Unassigned"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Phone</dt>
                      <dd className="font-medium text-gray-900">{employee.phone || "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(employee)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(employee)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{employee.full_name}</p>
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{roleLabels[employee.role]}</td>
                      <td className="px-5 py-4 text-gray-700">
                        {employee.branch_id ? branchMap.get(employee.branch_id) || "Unknown" : "Unassigned"}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{employee.phone || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            employee.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(employee)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmployeeToDelete(employee)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={paginated.page}
              pageSize={pageSize}
              totalItems={visibleEmployees.length}
              totalPages={paginated.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingEmployee ? "Edit Employee" : "Create Employee Account"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
              >
                <X size={17} />
              </button>
            </div>

            {!editingEmployee && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Create a secure Supabase account with a temporary password, then manage the employee profile automatically.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Full Name</span>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    required
                    disabled={Boolean(editingEmployee)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    required={!editingEmployee}
                  />
                </label>

                {!editingEmployee && (
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Temporary Password</span>
                    <input
                      type="password"
                      value={form.temporaryPassword}
                      onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))}
                      className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                      required
                      minLength={8}
                    />
                  </label>
                )}

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Role</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: normalizeRole(event.target.value) }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                  >
                    {formRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Branch</span>
                  <select
                    value={form.branchId}
                    onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    disabled={profile?.role === "branch_manager"}
                    required={!editingEmployee && form.role !== "super_admin"}
                  >
                    <option value="">Unassigned</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Employee is active
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(employeeToDelete)}
        title="Delete employee"
        description={`Delete ${employeeToDelete?.full_name || "this employee"} from Supabase profiles?`}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        destructive
        busy={Boolean(deletingId)}
        onConfirm={() => void confirmDeleteEmployee()}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setEmployeeToDelete(null);
          }
        }}
      />
    </section>
  );
}
