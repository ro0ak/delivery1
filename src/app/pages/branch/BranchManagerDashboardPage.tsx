import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
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
            حركة الشحنات
          </h2>

          <p>
            ستظهر هنا الشحنات الواردة
            والصادرة، والشحنات الموجودة
            حاليًا في الفرع، والشحنات
            المتوقع وصولها، والشحنات
            الجاهزة للمغادرة.
          </p>
        </article>

        <article>
          <h2>
            الحسابات اليومية
          </h2>

          <p>
            ستظهر هنا إيرادات الفرع،
            والتحصيلات، وعمولات
            السائقين، وحصة الفرع،
            والمصروفات، وحالة الصندوق
            اليومي.
          </p>
        </article>

        <article>
          <h2>
            أداء الموظفين
          </h2>

          <p>
            عدد الشحنات التي سجلها كل
            موظف، وعدد عمليات الاستلام
            والتسليم والتعديلات التي
            أجراها.
          </p>
        </article>

        <article>
          <h2>
            أداء السائقين
          </h2>

          <p>
            عدد الشحنات المسندة
            والمسلّمة والمتعذرة،
            والتحصيلات الموجودة مع كل
            سائق ومستحقاته.
          </p>
        </article>
      </div>
    </section>
  );
}
