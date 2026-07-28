import {
  CircleDollarSign,
  MapPin,
  PackageCheck,
  Phone,
  Truck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function DriverDashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="driver-page">
      <section className="driver-welcome">
        <div>
          <span>مرحبًا بك</span>
          <h1>{profile?.fullName || "السائق"}</h1>
          <p>إليك ملخص مهامك لهذا اليوم.</p>
        </div>

        <div className="driver-status">
          <span />
          متاح للتوصيل
        </div>
      </section>

      <section className="driver-statistics">
        <article>
          <Truck size={23} />
          <span>المسندة إليك</span>
          <strong>0</strong>
        </article>

        <article>
          <PackageCheck size={23} />
          <span>تم تسليمها</span>
          <strong>0</strong>
        </article>

        <article>
          <CircleDollarSign size={23} />
          <span>التحصيلات</span>
          <strong>0.000 ر.ع</strong>
        </article>
      </section>

      <section className="driver-orders">
        <div className="driver-section-heading">
          <div>
            <h2>شحنات اليوم</h2>
            <p>الشحنات المسندة إليك للتوصيل</p>
          </div>

          <span>0 شحنة</span>
        </div>

        <div className="empty-state">
          <Truck size={40} />
          <strong>لا توجد شحنات مسندة إليك</strong>
          <p>
            ستظهر هنا الشحنات التي يقوم موظف الفرع بإسنادها
            إلى حسابك.
          </p>
        </div>
      </section>

      <nav className="driver-bottom-nav">
        <button type="button" className="active">
          <Truck size={21} />
          <span>الشحنات</span>
        </button>

        <button type="button">
          <MapPin size={21} />
          <span>الموقع</span>
        </button>

        <button type="button">
          <CircleDollarSign size={21} />
          <span>المستحقات</span>
        </button>

        <button type="button">
          <Phone size={21} />
          <span>الدعم</span>
        </button>
      </nav>
    </main>
  );
}
