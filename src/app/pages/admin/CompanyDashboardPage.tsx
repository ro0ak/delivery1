import {
  BarChart3,
  Building2,
  CircleDollarSign,
  Package,
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
              <Icon size={24} />

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
        <article>
          <h2>
            <BarChart3 size={22} />
            أداء الفروع
          </h2>

          <p>
            سيظهر هنا ترتيب الفروع حسب
            عدد الشحنات والتسليمات
            والإيرادات والأرباح ونسبة
            المرتجعات.
          </p>
        </article>

        <article>
          <h2>
            التنبيهات الإدارية
          </h2>

          <p>
            التحصيلات غير المسلمة،
            والصناديق غير المغلقة،
            والشحنات المتأخرة أو
            المفقودة، والمصروفات التي
            تحتاج إلى اعتماد.
          </p>
        </article>

        <article>
          <h2>
            ملخص الحسابات
          </h2>

          <p>
            إجمالي الإيرادات،
            والمصروفات، ومستحقات
            السائقين والتجار، والرواتب،
            وصافي ربح الشركة.
          </p>
        </article>

        <article>
          <h2>
            حركة الشركة
          </h2>

          <p>
            جميع الشحنات الموجودة في
            الفروع، والشحنات التي في
            الطريق، والواردة والصادرة
            بين الفروع.
          </p>
        </article>
      </div>
    </section>
  );
}
