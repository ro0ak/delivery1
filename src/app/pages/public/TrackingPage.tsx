import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Box,
  Clock3,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

export default function TrackingPage() {
  const [
    trackingNumber,
    setTrackingNumber,
  ] = useState("");

  const [
    submittedNumber,
    setSubmittedNumber,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    document.title =
      "تتبع الشحنة | ROCK Delivery";
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedNumber = trackingNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    setSubmittedNumber("");
    setErrorMessage("");

    if (normalizedNumber.length < 5) {
      setErrorMessage(
        "أدخل رقم شحنة صحيحًا.",
      );

      return;
    }

    setTrackingNumber(normalizedNumber);
    setSubmittedNumber(normalizedNumber);
  }

  return (
    <main
      className="customer-tracking"
      dir="rtl"
    >
      <header className="customer-brand">
        <div className="customer-brand__mark">
          <Truck size={26} />
        </div>

        <div>
          <strong>ROCK Delivery</strong>
          <span>
            توصيل موثوق بين فروعنا
          </span>
        </div>
      </header>

      <section className="customer-tracking__hero">
        <div className="customer-tracking__icon">
          <PackageSearch size={44} />
        </div>

        <span className="customer-eyebrow">
          تتبع الشحنة
        </span>

        <h1>
          شحنتك أقرب مما تتوقع
        </h1>

        <p>
          أدخل رقم التتبع الموجود في الإيصال
          لمعرفة حالة الشحنة وآخر تحديث.
        </p>

        <form
          className="customer-search"
          onSubmit={handleSubmit}
        >
          <Search size={21} />

          <input
            type="text"
            value={trackingNumber}
            onChange={(event) =>
              setTrackingNumber(
                event.target.value,
              )
            }
            placeholder="ROCK-BRM-SHR-000001"
            aria-label="رقم التتبع"
            autoComplete="off"
          />

          <button type="submit">
            تتبع الشحنة
          </button>
        </form>

        {errorMessage && (
          <p className="customer-error">
            {errorMessage}
          </p>
        )}

        {submittedNumber && (
          <article className="customer-result">
            <Box size={28} />

            <div>
              <span>رقم الشحنة</span>

              <strong dir="ltr">
                {submittedNumber}
              </strong>

              <p>
                واجهة البحث جاهزة. عند إنشاء
                جدول الشحنات وواجهة التتبع
                الآمنة ستظهر هنا الحالة
                الفعلية ومراحل حركة الشحنة.
              </p>
            </div>
          </article>
        )}
      </section>

      <section className="customer-benefits">
        <article>
          <MapPin size={24} />

          <h2>مكان الشحنة</h2>

          <p>
            شاهد آخر فرع أو مرحلة وصلت
            إليها شحنتك.
          </p>
        </article>

        <article>
          <Clock3 size={24} />

          <h2>آخر تحديث</h2>

          <p>
            سجل زمني واضح لحركة الشحنة.
          </p>
        </article>

        <article>
          <ShieldCheck size={24} />

          <h2>خصوصية وأمان</h2>

          <p>
            تظهر معلومات التتبع العامة فقط.
          </p>
        </article>
      </section>
    </main>
  );
}
