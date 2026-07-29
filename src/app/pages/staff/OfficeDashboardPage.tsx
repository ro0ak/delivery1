import {
  FilePlus2,
  HandHelping,
  PackageCheck,
  PackageSearch,
  Printer,
  ReceiptText,
} from "lucide-react";

const officeActions = [
  {
    title: "تسجيل شحنة جديدة",
    description:
      "تسجيل بيانات المرسل والمستلم وإنشاء رقم تتبع وإيصال.",
    icon: FilePlus2,
  },
  {
    title: "استلام شحنة",
    description:
      "استلام شحنة وصلت إلى الفرع وتحديث حالتها.",
    icon: HandHelping,
  },
  {
    title: "تسليم للعميل",
    description:
      "البحث برقم التتبع وتأكيد تسليم الشحنة للعميل.",
    icon: PackageCheck,
  },
  {
    title: "البحث عن شحنة",
    description:
      "عرض تفاصيل الشحنة وحالتها وسجل الحركة.",
    icon: PackageSearch,
  },
  {
    title: "الفواتير",
    description:
      "إنشاء أو تعديل وطباعة إيصالات الشحنات.",
    icon: ReceiptText,
  },
  {
    title: "الطباعة",
    description:
      "طباعة إيصال العميل أو كشف الشحنات.",
    icon: Printer,
  },
];

export default function OfficeDashboardPage() {
  return (
    <section
      className="role-page"
      dir="rtl"
    >
      <div className="role-page__heading">
        <span>
          وضع المكتب
        </span>

        <h1>
          مهام موظف الفرع
        </h1>

        <p>
          نفّذ معاملات العملاء اليومية
          من شاشة واضحة وسريعة.
        </p>
      </div>

      <div className="role-action-grid">
        {officeActions.map(
          ({
            title,
            description,
            icon: Icon,
          }) => (
            <button
              type="button"
              key={title}
            >
              <Icon size={25} />

              <strong>
                {title}
              </strong>

              <span>
                {description}
              </span>
            </button>
          ),
        )}
      </div>

      <div className="role-placeholder">
        الخطوة التالية ستكون ربط زر
        «تسجيل شحنة جديدة» بنموذج
        الشحنة وجدول Supabase وإنشاء
        رقم التتبع والفاتورة تلقائيًا.
      </div>
    </section>
  );
}
