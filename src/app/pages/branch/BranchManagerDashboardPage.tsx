import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  Truck,
  Users,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

const branchStatistics = [
  {
    label: "الشحنات الموجودة",
    value: "0",
    icon: PackageCheck,
  },
  {
    label: "الواردة اليوم",
    value: "0",
    icon: ArrowDownToLine,
  },
  {
    label: "الصادرة اليوم",
    value: "0",
    icon: ArrowUpFromLine,
  },
  {
    label: "السائقون النشطون",
    value: "0",
    icon: Truck,
  },
  {
    label: "موظفو الفرع",
    value: "0",
    icon: Users,
  },
  {
    label: "صافي حصة الفرع",
    value: "0.000 ر.ع",
    icon: CircleDollarSign,
  },
];

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
          {profile?.fullName ||
            "مدير الفرع"}{" "}
          فقط.
        </p>
      </div>

      <div className="manager-stats">
        {branchStatistics.map(
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
        {managerPanels.map(
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
