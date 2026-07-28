import {
  ArrowDownLeft,
  ArrowUpLeft,
  CircleDollarSign,
  Clock3,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const statistics = [
  {
    label: "شحنات اليوم",
    value: "0",
    note: "لم تُسجل شحنات بعد",
    icon: Package,
    trend: "neutral",
  },
  {
    label: "في الطريق",
    value: "0",
    note: "بين الفروع أو مع السائق",
    icon: Truck,
    trend: "neutral",
  },
  {
    label: "تم التسليم",
    value: "0",
    note: "خلال اليوم الحالي",
    icon: PackageCheck,
    trend: "up",
  },
  {
    label: "المرتجعات",
    value: "0",
    note: "خلال اليوم الحالي",
    icon: RotateCcw,
    trend: "down",
  },
];

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="dashboard-page">
      <section className="welcome-card">
        <div>
          <span>نظرة عامة</span>
          <h2>
            أهلًا بك، {profile?.fullName || "مستخدم النظام"}
          </h2>
          <p>
            ستظهر هنا إحصائيات الشحنات والفروع والتحصيلات
            حسب صلاحيات حسابك.
          </p>
        </div>

        <div className="welcome-card__time">
          <Clock3 size={22} />
          <span>آخر تحديث</span>
          <strong>
            {new Intl.DateTimeFormat("ar-OM", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date())}
          </strong>
        </div>
      </section>

      <section className="statistics-grid">
        {statistics.map((statistic) => {
          const Icon = statistic.icon;

          return (
            <article
              key={statistic.label}
              className="statistic-card"
            >
              <div className="statistic-card__top">
                <div className="statistic-card__icon">
                  <Icon size={23} />
                </div>

                {statistic.trend === "up" && (
                  <ArrowUpLeft size={19} />
                )}

                {statistic.trend === "down" && (
                  <ArrowDownLeft size={19} />
                )}
              </div>

              <span>{statistic.label}</span>
              <strong>{statistic.value}</strong>
              <p>{statistic.note}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <h3>حركة الشحنات</h3>
              <p>ملخص آخر حالات الشحنات</p>
            </div>

            <button type="button">عرض الجميع</button>
          </div>

          <div className="empty-state">
            <Package size={38} />
            <strong>لا توجد شحنات بعد</strong>
            <p>
              ستظهر حركة الشحنات فور ربط النظام بقاعدة
              البيانات.
            </p>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <h3>التحصيلات</h3>
              <p>ملخص المبالغ المالية</p>
            </div>

            <CircleDollarSign size={23} />
          </div>

          <div className="financial-summary">
            <div>
              <span>تم تحصيله اليوم</span>
              <strong>0.000 ر.ع</strong>
            </div>

            <div>
              <span>مع السائقين</span>
              <strong>0.000 ر.ع</strong>
            </div>

            <div>
              <span>لم يُسلّم للفرع</span>
              <strong>0.000 ر.ع</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
