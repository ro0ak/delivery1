import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../../utils/supabase";

interface BranchStats {
  shipmentsAtBranch: number;
  incomingToday: number;
  outgoingToday: number;
  activeDrivers: number;
  branchEmployees: number;
  pendingCollections: string;
}

const emptyStats: BranchStats = {
  shipmentsAtBranch: 0,
  incomingToday: 0,
  outgoingToday: 0,
  activeDrivers: 0,
  branchEmployees: 0,
  pendingCollections: "0.000",
};

const managerPanels = [
  {
    title: "حركة الشحنات",
    description:
      "الشحنات الواردة والصادرة والموجودة حاليًا في الفرع والمتوقع وصولها والجاهزة للمغادرة.",
    icon: PackageCheck,
  },
  {
    title: "الحسابات اليومية",
    description:
      "إيرادات الفرع والتحصيلات وعمولات السائقين وحصة الفرع والمصروفات وحالة الصندوق اليومي.",
    icon: CircleDollarSign,
  },
  {
    title: "أداء الموظفين",
    description:
      "عدد الشحنات التي سجلها كل موظف وعمليات الاستلام والتسليم والتعديلات التي أجراها.",
    icon: ClipboardList,
  },
  {
    title: "أداء السائقين",
    description:
      "عدد الشحنات المسندة والمسلّمة والمتعذرة والتحصيلات الموجودة مع كل سائق ومستحقاته.",
    icon: Truck,
  },
];

export default function BranchManagerDashboardPage() {
  const { profile } = useAuth();

  const [stats, setStats] = useState<BranchStats>(emptyStats);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const branchId = profile?.branchId;

    if (!branchId) {
      setLoadingStats(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    async function loadStats() {
      setLoadingStats(true);

      try {
        const [
          atBranchResult,
          incomingResult,
          outgoingResult,
          driversResult,
          employeesResult,
          collectionsResult,
        ] = await Promise.all([
          // Shipments currently at this branch (not yet delivered)
          supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("current_branch_id", branchId)
            .not("current_status_code", "eq", "delivered"),

          // Received at this branch today
          supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("destination_branch_id", branchId)
            .eq("current_status_code", "received_destination")
            .gte("updated_at", `${today}T00:00:00Z`),

          // Created (sent out) from this branch today
          supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("origin_branch_id", branchId)
            .gte("created_at", `${today}T00:00:00Z`),

          // Active drivers at this branch
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "driver")
            .eq("branch_id", branchId)
            .eq("is_active", true),

          // Branch employees
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .in("role", ["branch_employee", "operations"])
            .eq("branch_id", branchId)
            .eq("is_active", true),

          // Pending collections sum
          supabase
            .from("collections")
            .select("amount")
            .eq("branch_id", branchId)
            .eq("status", "pending"),
        ]);

        const pendingTotal = (collectionsResult.data || []).reduce(
          (sum: number, row: { amount: unknown }) => sum + Number(row.amount || 0),
          0,
        );

        setStats({
          shipmentsAtBranch: atBranchResult.count ?? 0,
          incomingToday: incomingResult.count ?? 0,
          outgoingToday: outgoingResult.count ?? 0,
          activeDrivers: driversResult.count ?? 0,
          branchEmployees: employeesResult.count ?? 0,
          pendingCollections: pendingTotal.toFixed(3),
        });
      } catch (error) {
        console.error("Failed to load branch stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    void loadStats();
  }, [profile?.branchId]);

  const branchStatistics = [
    { label: "الشحنات الموجودة",  value: loadingStats ? "…" : String(stats.shipmentsAtBranch), icon: PackageCheck },
    { label: "الواردة اليوم",      value: loadingStats ? "…" : String(stats.incomingToday),     icon: ArrowDownToLine },
    { label: "الصادرة اليوم",      value: loadingStats ? "…" : String(stats.outgoingToday),     icon: ArrowUpFromLine },
    { label: "السائقون النشطون",   value: loadingStats ? "…" : String(stats.activeDrivers),     icon: Truck },
    { label: "موظفو الفرع",        value: loadingStats ? "…" : String(stats.branchEmployees),   icon: Users },
    {
      label: "التحصيلات المعلقة",
      value: loadingStats ? "…" : `${stats.pendingCollections} ر.ع`,
      icon: CircleDollarSign,
    },
  ];

  return (
    <section
      className="role-page"
      dir="rtl"
    >
      <div className="role-page__heading">
        <span>
          لوحة مدير الفرع
        </span>

        <h1>
          تشغيل الفرع لحظة بلحظة
        </h1>

        <p>
          تظهر هنا بيانات الفرع المرتبط
          بحساب{" "}
          {profile?.fullName || "مدير الفرع"}{" "}
          فقط.
        </p>
      </div>

      {loadingStats ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <LoaderCircle className="animate-spin" size={18} />
          <span>جاري تحميل إحصائيات الفرع…</span>
        </div>
      ) : null}

      <div className="manager-stats">
        {branchStatistics.map(
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
        {managerPanels.map(
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
