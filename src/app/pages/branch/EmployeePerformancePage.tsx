import { ClipboardList, LoaderCircle, Search, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TablePagination from "../../components/erp/TablePagination";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  paginateRows,
} from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface EmployeeRow {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface PerformanceRow extends EmployeeRow {
  createdShipments: number;
  receiveOps: number;
  deliveryOps: number;
  totalUpdates: number;
}

export default function EmployeePerformancePage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<PerformanceRow[]>([]);
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
      const [employeesResponse, shipmentsResponse, historyResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,role,is_active")
          .eq("branch_id", profile.branchId)
          .in("role", ["branch_manager", "branch_employee", "accountant", "operations"])
          .order("full_name", { ascending: true }),
        supabase
          .from("shipments")
          .select("created_by")
          .eq("origin_branch_id", profile.branchId),
        supabase
          .from("shipment_status_history")
          .select("changed_by,new_status_code")
          .eq("branch_id", profile.branchId),
      ]);

      if (employeesResponse.error) throw employeesResponse.error;
      if (shipmentsResponse.error) throw shipmentsResponse.error;
      if (historyResponse.error) throw historyResponse.error;

      const createdCounts = (shipmentsResponse.data || []).reduce<Record<string, number>>((accumulator, row) => {
        const key = String((row as { created_by?: unknown }).created_by || "");
        if (!key) return accumulator;
        return { ...accumulator, [key]: (accumulator[key] || 0) + 1 };
      }, {});

      const historyCounts = (historyResponse.data || []).reduce<Record<string, { receive: number; delivered: number; total: number }>>((accumulator, row) => {
        const key = String((row as { changed_by?: unknown }).changed_by || "");
        if (!key) return accumulator;
        const current = accumulator[key] || { receive: 0, delivered: 0, total: 0 };
        const status = String((row as { new_status_code?: unknown }).new_status_code || "");
        return {
          ...accumulator,
          [key]: {
            receive: current.receive + (status === "received_destination" ? 1 : 0),
            delivered: current.delivered + (status === "delivered" ? 1 : 0),
            total: current.total + 1,
          },
        };
      }, {});

      setRows(
        (employeesResponse.data || []).map((employee) => {
          const id = String(employee.id);
          const stats = historyCounts[id] || { receive: 0, delivered: 0, total: 0 };
          return {
            id,
            full_name: String((employee as { full_name?: unknown }).full_name || "Unnamed Employee"),
            role: String((employee as { role?: unknown }).role || "branch_employee"),
            is_active: Boolean((employee as { is_active?: unknown }).is_active),
            createdShipments: createdCounts[id] || 0,
            receiveOps: stats.receive,
            deliveryOps: stats.delivered,
            totalUpdates: stats.total,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to load employee performance:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load employee performance: ${error.message}` : "Failed to load employee performance.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.branchId]);

  useEffect(() => {
    document.title = "Employee Performance | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useAutoRefresh(loadData, 60000, Boolean(profile?.branchId));

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (statusFilter === "active" && !row.is_active) return false;
    if (statusFilter === "inactive" && row.is_active) return false;
    return matchesSearch([row.full_name, row.role], searchQuery);
  }), [rows, searchQuery, statusFilter]);

  const paginated = useMemo(() => paginateRows(visibleRows, page, pageSize), [page, pageSize, visibleRows]);

  const totals = useMemo(() => ({
    created: visibleRows.reduce((sum, row) => sum + row.createdShipments, 0),
    received: visibleRows.reduce((sum, row) => sum + row.receiveOps, 0),
    delivered: visibleRows.reduce((sum, row) => sum + row.deliveryOps, 0),
  }), [visibleRows]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">لوحة الفرع</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">أداء الموظفين</h1>
        <p className="mt-2 text-sm text-gray-500">قياس تسجيل الشحنات وعمليات الاستلام والتسليم والتحديثات لكل موظف.</p>
      </div>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <SmallStat icon={ClipboardList} label="الشحنات المسجلة" value={totals.created} />
        <SmallStat icon={UserCog} label="عمليات الاستلام" value={totals.received} />
        <SmallStat icon={UserCog} label="عمليات التسليم" value={totals.delivered} />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث باسم الموظف أو الدور" className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-red-600" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">متوقف</option>
          </select>
          <div className="flex items-center rounded-xl bg-gray-50 px-4 text-sm text-gray-500">{visibleRows.length} موظف</div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={18} /> جاري التحميل...</div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-gray-500">لا توجد بيانات أداء متاحة.</div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{row.full_name}</p>
                      <p className="text-xs text-gray-500">{row.role}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{row.is_active ? "نشط" : "متوقف"}</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between"><dt>شحنات مسجلة</dt><dd className="font-medium text-gray-900">{row.createdShipments}</dd></div>
                    <div className="flex justify-between"><dt>استلام</dt><dd className="font-medium text-gray-900">{row.receiveOps}</dd></div>
                    <div className="flex justify-between"><dt>تسليم</dt><dd className="font-medium text-gray-900">{row.deliveryOps}</dd></div>
                    <div className="flex justify-between"><dt>كل التحديثات</dt><dd className="font-medium text-gray-900">{row.totalUpdates}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-5 py-3">الموظف</th>
                    <th className="px-5 py-3">الدور</th>
                    <th className="px-5 py-3">شحنات مسجلة</th>
                    <th className="px-5 py-3">استلام</th>
                    <th className="px-5 py-3">تسليم</th>
                    <th className="px-5 py-3">كل التحديثات</th>
                    <th className="px-5 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 font-semibold text-gray-900">{row.full_name}</td>
                      <td className="px-5 py-4 text-gray-700">{row.role}</td>
                      <td className="px-5 py-4 text-gray-700">{row.createdShipments}</td>
                      <td className="px-5 py-4 text-gray-700">{row.receiveOps}</td>
                      <td className="px-5 py-4 text-gray-700">{row.deliveryOps}</td>
                      <td className="px-5 py-4 text-gray-700">{row.totalUpdates}</td>
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

function SmallStat({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number; }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={18} /></div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
