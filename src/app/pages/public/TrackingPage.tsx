import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Box,
  MapPin,
  PackageSearch,
  ScanLine,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "react-router";

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submittedNumber, setSubmittedNumber] = useState("");

  useEffect(() => {
    document.title = "تتبع الشحنة | ROCK Delivery";
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedNumber = trackingNumber
      .trim()
      .toUpperCase();

    setSubmittedNumber(normalizedNumber);
  }

  return (
    <main className="tracking-page">
      <header className="public-header">
        <Link to="/tracking" className="public-brand">
          <div>
            <Truck size={25} />
          </div>

          <span>
            <strong>ROCK Delivery</strong>
            <small>خدمات التوصيل</small>
          </span>
        </Link>

        <Link to="/login" className="secondary-button">
          دخول الموظفين
          <ArrowLeft size={18} />
        </Link>
      </header>

      <section className="tracking-hero">
        <div className="tracking-hero__icon">
          <PackageSearch size={42} />
        </div>

        <span className="section-eyebrow">تتبع شحنتك</span>

        <h1>اعرف مكان شحنتك وآخر تحديث لها</h1>

        <p>
          أدخل رقم الشحنة الموجود في الإيصال أو امسح رمز QR
          لمشاهدة حالة الشحنة.
        </p>

        <form
          className="tracking-search"
          onSubmit={handleSubmit}
        >
          <div className="tracking-search__input">
            <Search size={21} />

            <input
              type="text"
              value={trackingNumber}
              placeholder="مثال: ROCK-BRM-SHR-000001"
              aria-label="رقم الشحنة"
              onChange={(event) =>
                setTrackingNumber(event.target.value)
              }
              required
            />

            <button
              type="button"
              aria-label="مسح رمز QR"
              title="مسح رمز QR"
            >
              <ScanLine size={23} />
            </button>
          </div>

          <button type="submit" className="primary-button">
            تتبع الشحنة
          </button>
        </form>

        {submittedNumber && (
          <div className="tracking-placeholder-result">
            <Box size={28} />

            <div>
              <strong>{submittedNumber}</strong>
              <p>
                تم تجهيز واجهة التتبع. سيتم ربط نتيجة البحث
                بقاعدة بيانات Supabase في مرحلة الشحنات.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="tracking-benefits">
        <article>
          <div>
            <MapPin size={23} />
          </div>
          <h2>آخر حالة</h2>
          <p>شاهد آخر مرحلة وصلت إليها شحنتك.</p>
        </article>

        <article>
          <div>
            <Truck size={23} />
          </div>
          <h2>تحديثات واضحة</h2>
          <p>تابع حركة الشحنة بين الفروع وحتى التسليم.</p>
        </article>

        <article>
          <div>
            <ShieldCheck size={23} />
          </div>
          <h2>خصوصية وأمان</h2>
          <p>تظهر للعميل معلومات التتبع العامة فقط.</p>
        </article>
      </section>
    </main>
  );
}
