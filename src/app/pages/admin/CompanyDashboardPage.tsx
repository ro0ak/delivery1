import {
  BarChart3,
  BellRing,
  Building2,
  CircleDollarSign,
  LoaderCircle,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

interface CompanyStats {
  activeBranches: number;
  shipmentsToday: number;
  totalStaff: number;
  todayShippingFees: string;
}

const emptyStats: CompanyStats = {
  activeBranches: 0,
  shipmentsToday: 0,
  totalStaff: 0,
  todayShippingFees: "0.000",
};

const companyPanels = [
  {
    title: "أداء الفروع",
    description:
      "ترتيب الفروع حسب عدد الشحنات والتسليمات والإيرادات والأرباح ونسبة المرتجعات.",
    icon: BarChart3,
  },
  {
    title: "التنبيهات الإدارية",
    description:
      "التحصيلات غير المسلمة والصناديق غير المغلقة والشحنات المتأخرة والمصروفات التي تحتاج اعتمادًا.",
    icon: BellRing,
  },
  {
    title: "ملخص الحسابات",
    description:
      "إجمالي الإيرادات والمصروفات ومستحقات السائقين والتجار والرواتب وصافي ربح الشركة.",
    icon: CircleDollarSign,
  },
  {
    title: "حركة الشركة",
    description:
      "جميع الشحنات الموجودة في الفروع والشحنات التي في الطريق والواردة والصادرة بين الفروع.",
    icon: Truck,
  },
];

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<CompanyStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    async function loadStats() {
      setLoading(true);

      try {
        const [
          branchesResult,
          shipmentsResult,
          staffResult,
          feesResult,
        ] = await Promise.all([
          // Active branches count
          supabase
            .from("branches")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),

          // Shipments created today
          supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${today}T00:00:00Z`),

          // Active staff (all roles except super_admin)
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .in("role", [
              "branch_manager",
              "branch_employee",
              "driver",
              "accountant",
              "operations",
            ])
            .eq("is_active", true),

          // Today's total shipping fees
          supabase
            .from("shipments")
            .select("shipping_fee")
            .gte("created_at", `${today}T00:00:00Z`),
        ]);

        const todayFees = (feesResult.data || []).reduce(
          (sum: number, row: { shipping_fee: unknown }) =>
            sum + Number(row.shipping_fee || 0),
          0,
        );

        setStats({
          activeBranches:    branchesResult.count  ?? 0,
          shipmentsToday:    shipmentsResult.count  ?? 0,
          totalStaff:        staffResult.count      ?? 0,
          todayShippingFees: todayFees.toFixed(3),
        });
      } catch (error) {
        console.error("Failed to load company stats:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, []);

  const companyStatistics = [
    { label: "الفروع النشطة",        value: loading ? "…" : String(stats.activeBranches),    icon: Building2 },
    { label: "شحنات اليوم",          value: loading ? "…" : String(stats.shipmentsToday),    icon: Package },
    { label: "الموظفون والسائقون",    value: loading ? "…" : String(stats.totalStaff),        icon: Users },
    { label: "إيرادات اليوم",        value: loading ? "…" : `${stats.todayShippingFees} ر.ع`, icon: CircleDollarSign },
  ];

  return (
    <section
      className="role-page"
      dir="rtl"
    >
      <div className="role-page__heading">
        <span>
          الإدارة العامة
        </span>

        <h1>
          صورة كاملة عن الشركة
        </h1>

        <p>
          مقارنة الفروع ومتابعة التشغيل
          والحسابات من مكان واحد.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <LoaderCircle className="animate-spin" size={18} />
          <span>جاري تحميل إحصائيات الشركة…</span>
        </div>
      ) : null}

      <div className="company-overview">
        {companyStatistics.map(
          ({ label, value, icon: Icon }) => (
            <article key={label}>
              <div>
                <Icon size={23} />
              </div>

              <span>
                {label}
              </span>

              <strong>
                {value}
              </strong>
            </article>
          ),
        )}
      </div>

      <div className="manager-panels">
        {companyPanels.map(
          ({ title, description, icon: Icon }) => (
            <article key={title}>
              <div className="manager-panel__icon">
                <Icon size={22} />
              </div>

              <h2>{title}</h2>

              <p>{description}</p>

              <button type="button">
                عرض التفاصيل
              </button>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
