import {
  BriefcaseBusiness,
  LogOut,
  Truck,
} from "lucide-react";

import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export default function WorkModePage() {
  const navigate = useNavigate();

  const {
    profile,
    logout,
  } = useAuth();

  return (
    <main
      className="work-mode"
      dir="rtl"
    >
      <header>
        <div>
          <strong>
            ROCK Delivery
          </strong>

          <span>
            اختيار وضع العمل
          </span>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
        >
          <LogOut size={18} />

          تسجيل الخروج
        </button>
      </header>

      <section className="work-mode__intro">
        <span>
          مرحبًا،{" "}
          {profile?.fullName ||
            "موظف النظام"}
        </span>

        <h1>
          أين ستعمل الآن؟
        </h1>

        <p>
          اختر وضع العمل لهذه الفترة.
          يمكنك العودة وتغيير الوضع لاحقًا.
        </p>
      </section>

      <section className="work-mode__grid">
        <button
          type="button"
          onClick={() =>
            navigate("/staff/office")
          }
        >
          <BriefcaseBusiness size={36} />

          <strong>
            موظف المكتب
          </strong>

          <span>
            تسجيل الشحنات، استلام
            وتسليم الطلبات، الفواتير
            وتحديث الحالات.
          </span>

          <i>
            فتح وضع المكتب
          </i>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/staff/delivery")
          }
        >
          <Truck size={36} />

          <strong>
            التوصيل والرحلات
          </strong>

          <span>
            استلام الشحنات المسندة،
            بدء الرحلة وتأكيد تسليم
            الطلبات.
          </span>

          <i>
            فتح وضع التوصيل
          </i>
        </button>
      </section>
    </main>
  );
}
