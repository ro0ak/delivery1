import {
  BarChart3,
  BellRing,
  Building2,
  CircleDollarSign,
  LoaderCircle,
  Package,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { formatMoney } from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface CompanyStats {
  activeBranches: number;
  shipmentsToday: number;
  totalStaff: number;
  todayShippingFees: number;
  pendingCollections: number;
  todayExpenses: number;
  delayedShipments: number;
  shipmentsInTransit: number;
}

const emptyStats: CompanyStats = {
  activeBranches: 0,
  shipmentsToday: 0,
  totalStaff: 0,
  todayShippingFees: 0,
  pendingCollections: 0,
  todayExpenses: 0,
  delayedShipments: 0,
  shipmentsInTransit: 0,
};

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<CompanyStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString();

      const [
        branchesResult,
        shipmentsResult,
        staffResult,
        feesResult,
        pendingCollectionsResult,
        expensesResult,
        delayedShipmentsResult,
        inTransitResult,
      ] = await Promise.all([
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("shipments").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00Z`),
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["branch_manager", "branch_employee", "driver", "accountant", "operations"]).eq("is_active", true),
        supabase.from("shipments").select("shipping_fee").gte("created_at", `${today}T00:00:00Z`),
        supabase.from("collections").select("amount").eq("status", "pending"),
        supabase.from("expenses").select("amount").eq("date", today),
        supabase.from("shipments").select("id", { count: "exact", head: true }).not("current_status_code", "eq", "delivered").lt("created_at", threeDaysAgo),
        supabase.from("shipments").select("id", { count: "exact", head: true }).in("current_status_code", ["assigned", "on_delivery", "out_for_delivery", "received_destination"]),
      ]);

      const todayFees = (feesResult.data || []).reduce(
        (sum: number, row: { shipping_fee: unknown }) => sum + Number(row.shipping_fee || 0),
        0,
      );
      const pendingCollections = (pendingCollectionsResult.data || []).reduce(
        (sum: number, row: { amount: unknown }) => sum + Number(row.amount || 0),
        0,
      );
      const todayExpenses = (expensesResult.data || []).reduce(
        (sum: number, row: { amount: unknown }) => sum + Number(row.amount || 0),
        0,
      );

      setStats({
        activeBranches: branchesResult.count ?? 0,
        shipmentsToday: shipmentsResult.count ?? 0,
        totalStaff: staffResult.count ?? 0,
        todayShippingFees: todayFees,
        pendingCollections,
        todayExpenses,
        delayedShipments: delayedShipmentsResult.count ?? 0,
        shipmentsInTransit: inTransitResult.count ?? 0,
      });
    } catch (error) {
      console.error("Failed to load company stats:", error);
      setErrorMessage(
        error instanceof Error ? `تعذر تحميل إحصائيات الشركة: ${error.message}` : "تعذر تحميل إحصائيات الشركة.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useAutoRefresh(loadStats, 60000, true);

  const companyStatistics = [
    { label: "الفروع النشطة", value: String(stats.activeBranches), icon: Building2 },
    { label: "شحنات اليوم", value: String(stats.shipmentsToday), icon: Package },
    { label: "الموظفون والسائقون", value: String(stats.totalStaff), icon: Users },
    { label: "إيرادات اليوم", value: formatMoney(stats.todayShippingFees, "ر.ع"), icon: CircleDollarSign },
  ];

  const companyPanels = useMemo(
    () => [
      {
        title: "أداء الفروع",
        description: `الفروع النشطة ${stats.activeBranches} • الشحنات قيد الحركة ${stats.shipmentsInTransit}`,
        icon: BarChart3,
      },
      {
        title: "التنبيهات الإدارية",
        description: `الشحنات المتأخرة ${stats.delayedShipments} • التحصيلات المعلقة ${formatMoney(stats.pendingCollections, "ر.ع")}`,
        icon: BellRing,
      },
      {
        title: "ملخص الحسابات",
        description: `الإيرادات ${formatMoney(stats.todayShippingFees, "ر.ع")} • المصروفات ${formatMoney(stats.todayExpenses, "ر.ع")}`,
        icon: CircleDollarSign,
      },
      {
        title: "حركة الشركة",
        description: `الشحنات قيد النقل ${stats.shipmentsInTransit} • شحنات اليوم ${stats.shipmentsToday}`,
        icon: Truck,
      },
    ],
    [stats],
  );

  return (
    <section className="role-page" dir="rtl">
      <div className="role-page__heading">
        <span>الإدارة العامة</span>
        <h1>صورة كاملة عن الشركة</h1>
        <p>مقارنة الفروع ومتابعة التشغيل والحسابات مع تحديث تلقائي كل دقيقة.</p>
      </div>

      <button type="button" onClick={() => void loadStats()} className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
        <RefreshCw size={16} /> تحديث الآن
      </button>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <LoaderCircle className="animate-spin" size={18} />
          <span>جاري تحميل إحصائيات الشركة…</span>
        </div>
      ) : null}

      <div className="company-overview">
        {companyStatistics.map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <div><Icon size={23} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="manager-panels">
        {companyPanels.map(({ title, description, icon: Icon }) => (
          <article key={title}>
            <div className="manager-panel__icon"><Icon size={22} /></div>
            <h2>{title}</h2>
            <p>{description}</p>
            <button type="button" onClick={() => void loadStats()}>تحديث البيانات</button>
          </article>
        ))}
      </div>
    </section>
  );
}
