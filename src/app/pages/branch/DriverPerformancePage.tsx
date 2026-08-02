import { LoaderCircle, Search, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TablePagination from "../../components/erp/TablePagination";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  DEFAULT_PAGE_SIZE,
  formatMoney,
  matchesSearch,
  paginateRows,
} from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface DriverRow {
  id: string;
  full_name: string;
  is_active: boolean;
  vehicle_number: string | null;
  assigned: number;
  delivered: number;
  active: number;
  outstandingCollections: number;
}

export default function DriverPerformancePage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const loadData = useCallback(async () => {
    if (!profile?.branchId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [driversResponse, shipmentsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,is_active,vehicle_number")
          .eq("branch_id", profile.branchId)
          .eq("role", "driver")
          .order("full_name", { ascending: true }),
        supabase
          .from("shipments")
          .select("driver_id,current_status_code,collection_required,collection_amount")
          .or(`origin_branch_id.eq.${profile.branchId},destination_branch_id.eq.${profile.branchId},current_branch_id.eq.${profile.branchId}`)
          .not("driver_id", "is", null),
      ]);

      if (driversResponse.error) throw driversResponse.error;
      if (shipmentsResponse.error) throw shipmentsResponse.error;

      const stats = (shipmentsResponse.data || []).reduce<Record<string, { assigned: number; delivered: number; active: number; collections: number }>>((accumulator, row) => {
        const key = String((row as { driver_id?: unknown }).driver_id || "");
        if (!key) return accumulator;
        const current = accumulator[key] || { assigned: 0, delivered: 0, active: 0, collections: 0 };
        const status = String((row as { current_status_code?: unknown }).current_status_code || "");
        const collectionRequired = Boolean((row as { collection_required?: unknown }).collection_required);
        const collectionAmount = Number((row as { collection_amount?: unknown }).collection_amount || 0);
        return {
          ...accumulator,
          [key]: {
            assigned: current.assigned + 1,
            delivered: current.delivered + (status === "delivered" ? 1 : 0),
            active: current.active + (["assigned", "on_delivery", "out_for_delivery"].includes(status) ? 1 : 0),
            collections: current.collections + (collectionRequired && status !== "delivered" ? collectionAmount : 0),
          },
        };
      }, {});

      setRows(
        (driversResponse.data || []).map((driver) => {
          const id = String(driver.id);
          const driverStats = stats[id] || { assigned: 0, delivered: 0, active: 0, collections: 0 };
          return {
            id,
            full_name: String((driver as { full_name?: unknown }).full_name || "Unnamed Driver"),
            is_active: Boolean((driver as { is_active?: unknown }).is_active),
            vehicle_number: ((driver as { vehicle_number?: string | null }).vehicle_number || null) as string | null,
            assigned: driverStats.assigned,
            delivered: driverStats.delivered,
            active: driverStats.active,
            outstandingCollections: driverStats.collections,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to load driver performance:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load driver performance: ${error.message}` : "Failed to load driver performance.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.branchId]);

  useEffect(() => {
    document.title = "Driver Performance | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useAutoRefresh(loadData, 60000, Boolean(profile?.branchId));

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (statusFilter === "active" && !row.is_active) return false;
    if (statusFilter === "inactive" && row.is_active) return false;
    return matchesSearch([row.full_name, row.vehicle_number], searchQuery);
  }), [rows, searchQuery, statusFilter]);

  const paginated = useMemo(() => paginateRows(visibleRows, page, pageSize), [page, pageSize, visibleRows]);

  const totals = useMemo(() => ({
    assigned: visibleRows.reduce((sum, row) => sum + row.assigned, 0),
    delivered: visibleRows.reduce((sum, row) => sum + row.delivered, 0),
    collections: visibleRows.reduce((sum, row) => sum + row.outstandingCollections, 0),
  }), [visibleRows]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">لوحة الفرع</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">أداء السائقين</h1>
        <p className="mt-2 text-sm text-gray-500">قياس الشحنات المسندة والمسلّمة والتحصيلات المعلقة لكل سائق.</p>
      </div>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <DriverStat label="إجمالي الإسناد" value={totals.assigned} />
        <DriverStat label="إجمالي التسليم" value={totals.delivered} />
        <DriverStat label="تحصيلات معلقة" value={formatMoney(totals.collections)} />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث باسم السائق أو رقم المركبة" className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-red-600" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">متوقف</option>
          </select>
          <div className="flex items-center rounded-xl bg-gray-50 px-4 text-sm text-gray-500">{visibleRows.length} سائق</div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={18} /> جاري التحميل...</div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-gray-500">لا توجد بيانات أداء للسائقين.</div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{row.full_name}</p>
                      <p className="text-xs text-gray-500">{row.vehicle_number || "بدون مركبة"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{row.is_active ? "نشط" : "متوقف"}</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between"><dt>مسندة</dt><dd className="font-medium text-gray-900">{row.assigned}</dd></div>
                    <div className="flex justify-between"><dt>مسلّمة</dt><dd className="font-medium text-gray-900">{row.delivered}</dd></div>
                    <div className="flex justify-between"><dt>نشطة الآن</dt><dd className="font-medium text-gray-900">{row.active}</dd></div>
                    <div className="flex justify-between"><dt>تحصيلات</dt><dd className="font-medium text-gray-900">{formatMoney(row.outstandingCollections)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-5 py-3">السائق</th>
                    <th className="px-5 py-3">المركبة</th>
                    <th className="px-5 py-3">إجمالي الإسناد</th>
                    <th className="px-5 py-3">المسلّم</th>
                    <th className="px-5 py-3">النشط الآن</th>
                    <th className="px-5 py-3">التحصيلات المعلقة</th>
                    <th className="px-5 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 font-semibold text-gray-900">{row.full_name}</td>
                      <td className="px-5 py-4 text-gray-700">{row.vehicle_number || "—"}</td>
                      <td className="px-5 py-4 text-gray-700">{row.assigned}</td>
                      <td className="px-5 py-4 text-gray-700">{row.delivered}</td>
                      <td className="px-5 py-4 text-gray-700">{row.active}</td>
                      <td className="px-5 py-4 text-gray-700">{formatMoney(row.outstandingCollections)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{row.is_active ? "نشط" : "متوقف"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={paginated.page} pageSize={pageSize} totalItems={visibleRows.length} totalPages={paginated.totalPages} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} />
          </>
        )}
      </div>
    </section>
  );
}

function DriverStat({ label, value }: { label: string; value: number | string; }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Truck size={18} /></div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
