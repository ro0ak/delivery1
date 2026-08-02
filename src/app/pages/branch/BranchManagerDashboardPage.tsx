import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { formatMoney } from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface BranchStats {
  shipmentsAtBranch: number;
  incomingToday: number;
  outgoingToday: number;
  activeDrivers: number;
  branchEmployees: number;
  pendingCollections: number;
  todayExpenses: number;
  deliveredToday: number;
  shipmentUpdatesToday: number;
}

interface BranchOption {
  id: string;
  name: string;
}

const emptyStats: BranchStats = {
  shipmentsAtBranch: 0,
  incomingToday: 0,
  outgoingToday: 0,
  activeDrivers: 0,
  branchEmployees: 0,
  pendingCollections: 0,
  todayExpenses: 0,
  deliveredToday: 0,
  shipmentUpdatesToday: 0,
};

export default function BranchManagerDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<BranchStats>(emptyStats);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const branchId = profile?.branchId || selectedBranchId;

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorMessage("");

    try {
      const { data: branchRows, error: branchError } = await supabase
        .from("branches")
        .select("id,name")
        .order("name", { ascending: true });

      if (branchError) {
        throw branchError;
      }

      setBranches((branchRows || []) as BranchOption[]);

      const resolvedBranchId = profile?.branchId || selectedBranchId || branchRows?.[0]?.id;
      if (!profile?.branchId && resolvedBranchId && resolvedBranchId !== selectedBranchId) {
        setSelectedBranchId(resolvedBranchId);
      }

      if (!resolvedBranchId) {
        setStats(emptyStats);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const [
        atBranchResult,
        incomingResult,
        outgoingResult,
        driversResult,
        employeesResult,
        collectionsResult,
        expensesResult,
        deliveredResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("current_branch_id", resolvedBranchId)
          .not("current_status_code", "eq", "delivered"),
        supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("destination_branch_id", resolvedBranchId)
          .gte("updated_at", `${today}T00:00:00Z`),
        supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("origin_branch_id", resolvedBranchId)
          .gte("created_at", `${today}T00:00:00Z`),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "driver")
          .eq("branch_id", resolvedBranchId)
          .eq("is_active", true),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("role", ["branch_manager", "branch_employee", "accountant", "operations"])
          .eq("branch_id", resolvedBranchId)
          .eq("is_active", true),
        supabase
          .from("collections")
          .select("amount")
          .eq("branch_id", resolvedBranchId)
          .eq("status", "pending"),
        supabase
          .from("expenses")
          .select("amount")
          .eq("branch_id", resolvedBranchId)
          .eq("date", today),
        supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("destination_branch_id", resolvedBranchId)
          .eq("current_status_code", "delivered")
          .gte("updated_at", `${today}T00:00:00Z`),
        supabase
          .from("shipment_status_history")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", resolvedBranchId)
          .gte("created_at", `${today}T00:00:00Z`),
      ]);

      const pendingCollections = (collectionsResult.data || []).reduce(
        (sum: number, row: { amount: unknown }) => sum + Number(row.amount || 0),
        0,
      );

      const todayExpenses = (expensesResult.data || []).reduce(
        (sum: number, row: { amount: unknown }) => sum + Number(row.amount || 0),
        0,
      );

      setStats({
        shipmentsAtBranch: atBranchResult.count ?? 0,
        incomingToday: incomingResult.count ?? 0,
        outgoingToday: outgoingResult.count ?? 0,
        activeDrivers: driversResult.count ?? 0,
        branchEmployees: employeesResult.count ?? 0,
        pendingCollections,
        todayExpenses,
        deliveredToday: deliveredResult.count ?? 0,
        shipmentUpdatesToday: historyResult.count ?? 0,
      });
    } catch (error) {
      console.error("Failed to load branch stats:", error);
      setErrorMessage(
        error instanceof Error ? `تعذر تحميل إحصائيات الفرع: ${error.message}` : "تعذر تحميل إحصائيات الفرع.",
      );
    } finally {
      setLoadingStats(false);
    }
  }, [profile?.branchId, selectedBranchId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useAutoRefresh(loadStats, 60000, true);

  const branchStatistics = [
    { label: "الشحنات الموجودة", value: String(stats.shipmentsAtBranch), icon: PackageCheck },
    { label: "الواردة اليوم", value: String(stats.incomingToday), icon: ArrowDownToLine },
    { label: "الصادرة اليوم", value: String(stats.outgoingToday), icon: ArrowUpFromLine },
    { label: "السائقون النشطون", value: String(stats.activeDrivers), icon: Truck },
    { label: "موظفو الفرع", value: String(stats.branchEmployees), icon: Users },
    { label: "التحصيلات المعلقة", value: formatMoney(stats.pendingCollections, "ر.ع"), icon: CircleDollarSign },
  ];

  const managerPanels = useMemo(
    () => [
      {
        title: "حركة الشحنات",
        description: `الواردة ${stats.incomingToday} • الصادرة ${stats.outgoingToday} • داخل الفرع ${stats.shipmentsAtBranch}`,
        icon: PackageCheck,
        path: "/branch/shipment-movement",
        cta: "عرض التفاصيل",
      },
      {
        title: "الحسابات اليومية",
        description: `تحصيلات معلقة ${formatMoney(stats.pendingCollections, "ر.ع")} • مصروفات اليوم ${formatMoney(stats.todayExpenses, "ر.ع")}`,
        icon: CircleDollarSign,
        path: "/branch/daily-accounts",
        cta: "عرض الحسابات",
      },
      {
        title: "أداء الموظفين",
        description: `عدد الموظفين النشطين ${stats.branchEmployees} • تحديثات اليوم ${stats.shipmentUpdatesToday}`,
        icon: ClipboardList,
        path: "/branch/employee-performance",
        cta: "عرض الأداء",
      },
      {
        title: "أداء السائقين",
        description: `السائقون النشطون ${stats.activeDrivers} • التسليمات اليوم ${stats.deliveredToday}`,
        icon: Truck,
        path: "/branch/driver-performance",
        cta: "عرض الأداء",
      },
    ],
    [stats],
  );

  return (
    <section className="role-page" dir="rtl">
      <div className="role-page__heading">
        <span>لوحة مدير الفرع</span>
        <h1>تشغيل الفرع لحظة بلحظة</h1>
        <p>تظهر هنا بيانات الفرع المرتبط بحسابك مع تحديث تلقائي كل دقيقة.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!profile?.branchId && (
          <select value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-600">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => void loadStats()} className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw size={16} /> تحديث الآن
        </button>
      </div>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      {loadingStats ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <LoaderCircle className="animate-spin" size={18} />
          <span>جاري تحميل إحصائيات الفرع…</span>
        </div>
      ) : null}

      <div className="manager-stats">
        {branchStatistics.map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <div><Icon size={23} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="manager-panels">
        {managerPanels.map(({ title, description, icon: Icon, path, cta }) => (
          <article key={title}>
            <div className="manager-panel__icon"><Icon size={22} /></div>
            <h2>{title}</h2>
            <p>{description}</p>
            <button type="button" onClick={() => navigate(path)}>{cta}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
