import {
  AlertCircle,
  Car,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  UserRound,
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
import { useAuth } from "../contexts/AuthContext";
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  paginateRows,
} from "../lib/erp";
import { createStaffUser } from "../lib/staffProvisioning";
import { supabase } from "../../utils/supabase";

type DriverStatus = "active" | "on_delivery" | "offline";

interface DriverRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  vehicle_number: string | null;
  branch_id: string | null;
  is_active: boolean;
  status: DriverStatus;
  active_shipments: number;
}

interface DriverFormState {
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  vehicleNumber: string;
  branchId: string;
  isActive: boolean;
}

interface BranchOption {
  id: string;
  name: string;
}

const emptyForm: DriverFormState = {
  fullName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
  vehicleNumber: "",
  branchId: "",
  isActive: true,
};

const statusLabels: Record<DriverStatus, string> = {
  active: "Active",
  on_delivery: "On Delivery",
  offline: "Offline",
};

const statusClasses: Record<DriverStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  on_delivery: "bg-amber-50 text-amber-700",
  offline: "bg-gray-100 text-gray-600",
};

export default function DriversPage() {
  const { profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<DriverRow | null>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [driversResponse, branchesResponse, shipmentsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,phone,vehicle_number,branch_id,is_active")
          .eq("role", "driver")
          .order("full_name", { ascending: true }),
        supabase.from("branches").select("id,name").order("name", { ascending: true }),
        supabase
          .from("shipments")
          .select("driver_id,current_status_code")
          .in("current_status_code", ["assigned", "on_delivery", "out_for_delivery"]),
      ]);

      if (driversResponse.error) {
        throw driversResponse.error;
      }

      if (branchesResponse.error) {
        throw branchesResponse.error;
      }

      if (shipmentsResponse.error) {
        throw shipmentsResponse.error;
      }

      const shipmentCountByDriver = (shipmentsResponse.data || []).reduce<Record<string, number>>((accumulator, row) => {
        const driverId = String((row as { driver_id?: unknown }).driver_id || "");

        if (!driverId) {
          return accumulator;
        }

        return {
          ...accumulator,
          [driverId]: (accumulator[driverId] || 0) + 1,
        };
      }, {});

      setBranches((branchesResponse.data || []) as BranchOption[]);
      setDrivers(
        (driversResponse.data || []).map((driver) => {
          const id = String(driver.id);
          const isActive = Boolean((driver as { is_active?: unknown }).is_active);
          const activeShipments = shipmentCountByDriver[id] || 0;
          const status: DriverStatus = !isActive ? "offline" : activeShipments > 0 ? "on_delivery" : "active";

          return {
            id,
            full_name: String((driver as { full_name?: unknown }).full_name || "Unnamed Driver"),
            email: String((driver as { email?: unknown }).email || ""),
            phone: ((driver as { phone?: string | null }).phone || null) as string | null,
            vehicle_number: ((driver as { vehicle_number?: string | null }).vehicle_number || null) as string | null,
            branch_id: ((driver as { branch_id?: string | null }).branch_id || null) as string | null,
            is_active: isActive,
            status,
            active_shipments: activeShipments,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to load drivers page:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load drivers: ${error.message}` : "Failed to load drivers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Drivers | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, searchQuery, statusFilter]);

  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);

  const visibleDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      if (branchFilter !== "all" && driver.branch_id !== branchFilter) {
        return false;
      }

      if (statusFilter !== "all" && driver.status !== statusFilter) {
        return false;
      }

      return matchesSearch([driver.full_name, driver.email, driver.phone, driver.vehicle_number], searchQuery);
    });
  }, [branchFilter, drivers, searchQuery, statusFilter]);

  const paginated = useMemo(() => paginateRows(visibleDrivers, page, pageSize), [page, pageSize, visibleDrivers]);

  const statistics = useMemo(
    () => ({
      total: visibleDrivers.length,
      onDelivery: visibleDrivers.filter((driver) => driver.status === "on_delivery").length,
      active: visibleDrivers.filter((driver) => driver.status !== "offline").length,
    }),
    [visibleDrivers],
  );

  function openCreateForm() {
    setEditingDriver(null);
    setForm({
      ...emptyForm,
      branchId: profile?.role === "branch_manager" ? profile.branchId || "" : "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  }

  function openEditForm(driver: DriverRow) {
    setEditingDriver(driver);
    setForm({
      fullName: driver.full_name,
      email: driver.email,
      phone: driver.phone || "",
      temporaryPassword: "",
      vehicleNumber: driver.vehicle_number || "",
      branchId: driver.branch_id || "",
      isActive: driver.is_active,
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
    setEditingDriver(null);
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

    if (!editingDriver && !temporaryPassword) {
      setErrorMessage("Temporary password is required.");
      return;
    }

    if (profile?.role === "branch_manager" && profile.branchId && form.branchId !== profile.branchId) {
      setErrorMessage("Branch managers can only assign drivers to their own branch.");
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
        vehicle_number: form.vehicleNumber.trim() || null,
        branch_id: form.branchId || null,
        role: "driver",
        is_active: form.isActive,
      };

      if (editingDriver) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", editingDriver.id);

        if (error) {
          throw error;
        }

        setSuccessMessage("Driver updated successfully.");
      } else {
        const response = await createStaffUser({
          email,
          temporaryPassword,
          fullName,
          phone,
          role: "driver",
          branchId: form.branchId || null,
          vehicleNumber: form.vehicleNumber.trim(),
          isActive: form.isActive,
        });

        setSuccessMessage(
          response.message || "Driver account created successfully.",
        );
      }

      closeForm();
      await loadData();
      await refreshProfile();
    } catch (error) {
      console.error("Failed to save driver:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to save driver: ${error.message}` : "Failed to save driver.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteDriver() {
    if (!driverToDelete || deletingId) {
      return;
    }

    setDeletingId(driverToDelete.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", driverToDelete.id);

      if (error) {
        throw error;
      }

      setDrivers((current) => current.filter((driver) => driver.id !== driverToDelete.id));
      setSuccessMessage("Driver deleted successfully.");
      setDriverToDelete(null);
      await refreshProfile();
    } catch (error) {
      console.error("Failed to delete driver:", error);
      setErrorMessage(error instanceof Error ? `Failed to delete driver: ${error.message}` : "Failed to delete driver.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Fleet Operations
            </span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">Drivers Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage live driver profiles, branch assignment, vehicle numbers, and delivery availability.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Plus size={18} />
            Add Driver
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
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Truck size={18} />
          </div>
          <p className="text-sm text-gray-500">Visible Drivers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{statistics.total}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Car size={18} />
          </div>
          <p className="text-sm text-gray-500">On Delivery</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{statistics.onDelivery}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-sm text-gray-500">Active Drivers</p>
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
              placeholder="Search by driver name, vehicle number, email, or phone"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-red-600 focus:bg-white"
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
            onChange={(event) => setStatusFilter(event.target.value as DriverStatus | "all")}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_delivery">On Delivery</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading drivers...
          </div>
        ) : visibleDrivers.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
            <Truck className="text-gray-300" size={36} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">No drivers found</h2>
              <p className="mt-1 text-sm text-gray-500">Try changing the filters or link a new Supabase user.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((driver) => (
                <article key={driver.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                        <UserRound size={15} />
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{driver.full_name}</p>
                        <p className="text-xs text-gray-500">{driver.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[driver.status]}`}>
                      {statusLabels[driver.status]}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-3">
                      <dt>Phone</dt>
                      <dd className="font-medium text-gray-900">{driver.phone || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Vehicle</dt>
                      <dd className="font-medium text-gray-900">{driver.vehicle_number || "Not assigned"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Branch</dt>
                      <dd className="font-medium text-gray-900">
                        {driver.branch_id ? branchMap.get(driver.branch_id) || "Unknown" : "Unassigned"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Active Shipments</dt>
                      <dd className="font-medium text-gray-900">{driver.active_shipments}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(driver)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverToDelete(driver)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Driver</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Vehicle Number</th>
                    <th className="px-5 py-3">Active Shipments</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((driver) => (
                    <tr key={driver.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                            <UserRound size={15} />
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900">{driver.full_name}</span>
                            <p className="text-xs text-gray-500">{driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{driver.phone || "N/A"}</td>
                      <td className="px-5 py-4 text-gray-700">{driver.vehicle_number || "Not assigned"}</td>
                      <td className="px-5 py-4 text-gray-700">{driver.active_shipments}</td>
                      <td className="px-5 py-4 text-gray-700">
                        {driver.branch_id ? branchMap.get(driver.branch_id) || "Unknown" : "Unassigned"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[driver.status]}`}>
                          {statusLabels[driver.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(driver)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDriverToDelete(driver)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Delete
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
              totalItems={visibleDrivers.length}
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
                {editingDriver ? "Edit Driver" : "Create Driver Account"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
              >
                <X size={17} />
              </button>
            </div>

            {!editingDriver && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Create a secure Supabase account with a temporary password, branch assignment, and vehicle number.
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
                    disabled={Boolean(editingDriver)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    required={!editingDriver}
                  />
                </label>

                {!editingDriver && (
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
                  <span className="text-sm font-medium text-gray-700">Vehicle Number</span>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(event) => setForm((current) => ({ ...current, vehicleNumber: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    required={!editingDriver}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Branch</span>
                  <select
                    value={form.branchId}
                    onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                    disabled={profile?.role === "branch_manager"}
                    required={!editingDriver}
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
                Driver is active
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
        open={Boolean(driverToDelete)}
        title="Delete driver"
        description={`Delete ${driverToDelete?.full_name || "this driver"} from Supabase profiles?`}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        destructive
        busy={Boolean(deletingId)}
        onConfirm={() => void confirmDeleteDriver()}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setDriverToDelete(null);
          }
        }}
      />
    </section>
  );
}
