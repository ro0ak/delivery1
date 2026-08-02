import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  CircleDollarSign,
  LoaderCircle,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TablePagination from "../../components/erp/TablePagination";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  DEFAULT_PAGE_SIZE,
  formatDate,
  formatMoney,
  matchesSearch,
  paginateRows,
  toEndOfDayIso,
  toStartOfDayIso,
} from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface BranchOption {
  id: string;
  name: string;
}

interface ShipmentAccountRow {
  id: string;
  tracking_number: string;
  shipping_fee: number;
  collection_amount: number;
  created_at: string;
}

interface CollectionRow {
  id: string;
  source_name: string;
  amount: number;
  date: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export default function DailyAccountsPage() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [shipments, setShipments] = useState<ShipmentAccountRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "collections" | "expenses">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const activeBranchId = profile?.branchId || selectedBranchId;

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: branchRows, error: branchError } = await supabase
        .from("branches")
        .select("id,name")
        .order("name", { ascending: true });

      if (branchError) throw branchError;
      setBranches((branchRows || []) as BranchOption[]);

      const resolvedBranchId = profile?.branchId || selectedBranchId || branchRows?.[0]?.id;
      if (!profile?.branchId && resolvedBranchId && resolvedBranchId !== selectedBranchId) {
        setSelectedBranchId(resolvedBranchId);
      }

      if (!resolvedBranchId) {
        setShipments([]);
        setCollections([]);
        setExpenses([]);
        return;
      }

      const startIso = toStartOfDayIso(selectedDate);
      const endIso = toEndOfDayIso(selectedDate);

      const [shipmentsResponse, collectionsResponse, expensesResponse] = await Promise.all([
        supabase
          .from("shipments")
          .select("id,tracking_number,shipping_fee,collection_amount,created_at")
          .eq("origin_branch_id", resolvedBranchId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("collections")
          .select("id,source_name,amount,date")
          .eq("branch_id", resolvedBranchId)
          .eq("date", selectedDate),
        supabase
          .from("expenses")
          .select("id,description,amount,date,category")
          .eq("branch_id", resolvedBranchId)
          .eq("date", selectedDate),
      ]);

      if (shipmentsResponse.error) throw shipmentsResponse.error;
      if (collectionsResponse.error) throw collectionsResponse.error;
      if (expensesResponse.error) throw expensesResponse.error;

      setShipments((shipmentsResponse.data || []) as ShipmentAccountRow[]);
      setCollections((collectionsResponse.data || []) as CollectionRow[]);
      setExpenses((expensesResponse.data || []) as ExpenseRow[]);
    } catch (error) {
      console.error("Failed to load daily accounts:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load daily accounts: ${error.message}` : "Failed to load daily accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.branchId, selectedBranchId, selectedDate]);

  useEffect(() => {
    document.title = "Daily Accounts | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useAutoRefresh(loadData, 60000, Boolean(activeBranchId));

  useEffect(() => {
    setPage(1);
  }, [ledgerFilter, searchQuery, selectedDate]);

  const ledgerRows = useMemo(() => {
    const items = [
      ...collections.map((row) => ({
        id: row.id,
        type: "collection" as const,
        title: row.source_name,
        subtitle: selectedDate,
        amount: row.amount,
        category: "collection",
      })),
      ...expenses.map((row) => ({
        id: row.id,
        type: "expense" as const,
        title: row.description,
        subtitle: row.category,
        amount: row.amount,
        category: "expense",
      })),
    ];

    return items.filter((item) => {
      if (ledgerFilter === "collections" && item.type !== "collection") return false;
      if (ledgerFilter === "expenses" && item.type !== "expense") return false;
      return matchesSearch([item.title, item.subtitle], searchQuery);
    });
  }, [collections, expenses, ledgerFilter, searchQuery, selectedDate]);

  const paginated = useMemo(() => paginateRows(ledgerRows, page, pageSize), [ledgerRows, page, pageSize]);

  const summary = useMemo(() => {
    const shippingRevenue = shipments.reduce((sum, shipment) => sum + Number(shipment.shipping_fee || 0), 0);
    const collectionTotal = collections.reduce((sum, collection) => sum + Number(collection.amount || 0), 0);
    const expensesTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return {
      shippingRevenue,
      collectionTotal,
      expensesTotal,
      netCash: collectionTotal - expensesTotal,
    };
  }, [collections, expenses, shipments]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">لوحة الفرع</span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">الحسابات اليومية</h1>
            <p className="mt-2 text-sm text-gray-500">عرض إيرادات الشحنات والتحصيلات والمصروفات اليومية بصافي نقدي مباشر.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!profile?.branchId && (
              <select value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-600">
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-600" />
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CircleDollarSign} label="رسوم الشحن" value={formatMoney(summary.shippingRevenue)} tone="sky" />
        <StatCard icon={BanknoteArrowUp} label="التحصيلات" value={formatMoney(summary.collectionTotal)} tone="emerald" />
        <StatCard icon={BanknoteArrowDown} label="المصروفات" value={formatMoney(summary.expensesTotal)} tone="amber" />
        <StatCard icon={Wallet} label="صافي النقد" value={formatMoney(summary.netCash)} tone="red" />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث في دفتر اليومية" className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-red-600" />
          </label>
          <select value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value as typeof ledgerFilter)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600">
            <option value="all">كل القيود</option>
            <option value="collections">التحصيلات</option>
            <option value="expenses">المصروفات</option>
          </select>
          <div className="flex items-center rounded-xl bg-gray-50 px-4 text-sm text-gray-500">{shipments.length} شحنة صادرة في هذا اليوم</div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={18} /> جاري التحميل...</div>
        ) : ledgerRows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-gray-500">لا توجد بيانات محاسبية في هذا اليوم.</div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{row.title}</p>
                      <p className="text-xs text-gray-500">{row.subtitle}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.type === "collection" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {row.type === "collection" ? "تحصيل" : "مصروف"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{formatMoney(row.amount)}</p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-5 py-3">النوع</th>
                    <th className="px-5 py-3">البيان</th>
                    <th className="px-5 py-3">التفاصيل</th>
                    <th className="px-5 py-3">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 text-gray-700">{row.type === "collection" ? "تحصيل" : "مصروف"}</td>
                      <td className="px-5 py-4 text-gray-900">{row.title}</td>
                      <td className="px-5 py-4 text-gray-700">{row.subtitle}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={paginated.page} pageSize={pageSize} totalItems={ledgerRows.length} totalPages={paginated.totalPages} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} />
          </>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-gray-900"><Receipt size={18} /><h2 className="text-base font-bold">ملخص الشحنات</h2></div>
        {shipments.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد شحنات صادرة في هذا اليوم.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shipments.slice(0, 6).map((shipment) => (
              <article key={shipment.id} className="rounded-2xl border border-gray-200 p-4">
                <p className="font-mono text-xs font-semibold text-gray-900">{shipment.tracking_number}</p>
                <p className="mt-2 text-sm text-gray-700">رسوم الشحن: {formatMoney(shipment.shipping_fee)}</p>
                <p className="mt-1 text-sm text-gray-700">تحصيل مطلوب: {formatMoney(shipment.collection_amount)}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDate(shipment.created_at)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone: "sky" | "emerald" | "amber" | "red"; }) {
  const toneClasses = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}><Icon size={18} /></div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
