import {
  BarChart3,
  BellRing,
  Building2,
  CircleDollarSign,
  Package,
  Truck,
  Users,
} from "lucide-react";

const companyStatistics = [
  {
    label: "الفروع النشطة",
    value: "1",
    icon: Building2,
  },
  {
    label: "شحنات اليوم",
    value: "0",
    icon: Package,
  },
  {
    label: "الموظفون والسائقون",
    value: "1",
    icon: Users,
  },
  {
    label: "إيرادات اليوم",
    value: "0.000 ر.ع",
    icon: CircleDollarSign,
  },
];

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

      <div className="company-overview">
        {companyStatistics.map(
          ({
            label,
            value,
            icon: Icon,
          }) => (
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
          ({
            title,
            description,
            icon: Icon,
          }) => (
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
