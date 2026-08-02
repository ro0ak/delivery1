import {
  AlertCircle,
  Car,
  CheckCircle2,
  LoaderCircle,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../utils/supabase";

type DriverStatus = "active" | "on_delivery" | "offline";

interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_number: string | null;
  branch_id: string | null;
  status: DriverStatus;
  active_shipments: number;
}

interface BranchOption {
  id: string;
  name: string;
}

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
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Drivers | ROCK Delivery";
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [driversResponse, branchesResponse, shipmentsResponse] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,full_name,phone,vehicle_number,branch_id,is_active")
            .eq("role", "driver")
            .order("full_name", { ascending: true }),
          supabase.from("branches").select("id,name"),
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

        const shipmentRows = shipmentsResponse.error ? [] : shipmentsResponse.data || [];

        const shipmentCountByDriver = shipmentRows.reduce<Record<string, number>>((accumulator, row) => {
          const driverId = String((row as { driver_id?: string }).driver_id || "");

          if (!driverId) {
            return accumulator;
          }

          return {
            ...accumulator,
            [driverId]: (accumulator[driverId] || 0) + 1,
          };
        }, {});

        const rows = (driversResponse.data || []).map((driver) => {
          const isActive = Boolean((driver as { is_active?: boolean }).is_active);
          const activeShipments = shipmentCountByDriver[String((driver as { id: string }).id)] || 0;

          const status: DriverStatus = !isActive
            ? "offline"
            : activeShipments > 0
              ? "on_delivery"
              : "active";

          return {
            id: String((driver as { id: string }).id),
            full_name: String((driver as { full_name?: string }).full_name || "Unnamed Driver"),
            phone: ((driver as { phone?: string | null }).phone || null) as string | null,
          vehicle_number: ((driver as { vehicle_number?: string | null }).vehicle_number || null) as string | null,
            branch_id: ((driver as { branch_id?: string | null }).branch_id || null) as string | null,
            status,
            active_shipments: activeShipments,
          };
        });

        setDrivers(rows);
        setBranches((branchesResponse.data || []) as BranchOption[]);
      } catch (error) {
        console.error("Failed to load drivers page:", error);
        setErrorMessage(
          error instanceof Error ? `Failed to load drivers: ${error.message}` : "Failed to load drivers.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const branchMap = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.name]));
  }, [branches]);

  const visibleDrivers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return drivers.filter((driver) => {
      if (
        profile?.role === "branch_manager" &&
        profile.branchId &&
        driver.branch_id !== profile.branchId
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [driver.full_name, driver.phone, driver.vehicle_number]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [drivers, profile?.branchId, profile?.role, searchQuery]);

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          Fleet Operations
        </span>

        <h1 className="mt-3 text-2xl font-bold text-gray-950">Drivers Management</h1>
        <p className="mt-2 text-sm text-gray-500">
          Monitor delivery drivers, assigned active shipments, and operational status.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Truck size={18} />
          </div>
          <p className="text-sm text-gray-500">Total Drivers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visibleDrivers.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Car size={18} />
          </div>
          <p className="text-sm text-gray-500">On Delivery</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {visibleDrivers.filter((driver) => driver.status === "on_delivery").length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-sm text-gray-500">Active Drivers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {visibleDrivers.filter((driver) => driver.status !== "offline").length}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by driver name, vehicle number, or phone"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-red-600 focus:bg-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading drivers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Vehicle Number</th>
                  <th className="px-5 py-3">Active Shipments</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                          <UserRound size={15} />
                        </span>
                        <span className="font-semibold text-gray-900">{driver.full_name}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
