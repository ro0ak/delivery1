import {
  CircleDollarSign,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

export default function DeliveryDashboardPage() {
  const { profile } = useAuth();

  return (
    <main
      className="delivery-mode"
      dir="rtl"
    >
      <header>
        <div>
          <span>
            وضع التوصيل
          </span>

          <h1>
            {profile?.fullName ||
              "موظف التوصيل"}
          </h1>
        </div>

        <b>متاح</b>
      </header>

      <section className="delivery-stats">
        <article>
          <Truck size={23} />

          <span>
            الشحنات المسندة اليوم
          </span>

          <strong>0</strong>
        </article>

        <article>
          <PackageCheck size={23} />

          <span>
            تم تسليمها
          </span>

          <strong>0</strong>
        </article>

        <article>
          <CircleDollarSign size={23} />

          <span>
            مستحقات اليوم
          </span>

          <strong>
            0.000 ر.ع
          </strong>
        </article>
      </section>

      <section className="delivery-list">
        <div>
          <h2>
            الشحنات المسندة
          </h2>

          <span>
            0 شحنة
          </span>
        </div>

        <Route size={44} />

        <strong>
          لا توجد مهام توصيل الآن
        </strong>

        <p>
          ستظهر هنا الشحنات التي أسندها
          الفرع إلى حسابك.
        </p>
      </section>

      <aside className="commission-note">
        نموذج العمولة الحالي: 0.600 ر.ع
        للسائق و0.200 ر.ع للفرع عن كل
        عملية توصيل ناجحة. سنجعل هذه
        القيم قابلة للتعديل من إعدادات
        النظام لاحقًا، ولن تكون ثابتة
        داخل الكود.
      </aside>
    </main>
  );
}
