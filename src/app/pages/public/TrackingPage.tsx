import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Box,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

import { supabase } from "../../../utils/supabase";

interface TrackingResult {
  tracking_number: string;
  current_status_code: string;
  service_type: string | null;
  recipient_governorate: string | null;
  item_description: string | null;
  pieces_count: number | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  created:              "تم إنشاء الشحنة",
  received_destination: "تم استلامها في الفرع",
  in_transit:           "في الطريق",
  assigned:             "مسندة إلى سائق",
  on_delivery:          "جارٍ التوصيل",
  out_for_delivery:     "خرجت للتوصيل",
  delivered:            "تم التسليم",
  return_initiated:     "جارٍ الإرجاع",
  returned:             "تم الإرجاع",
  cancelled:            "ملغاة",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-OM", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function TrackingPage() {
  const [
    trackingNumber,
    setTrackingNumber,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState<TrackingResult | null>(null);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    document.title =
      "تتبع الشحنة | ROCK Delivery";
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedNumber = trackingNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    setResult(null);
    setErrorMessage("");

    if (normalizedNumber.length < 5) {
      setErrorMessage(
        "أدخل رقم شحنة صحيحًا.",
      );
      return;
    }

    setSearching(true);

    try {
      const { data, error } = await supabase.rpc(
        "track_shipment",
        { p_tracking_number: normalizedNumber },
      );

      if (error) {
        throw error;
      }

      const rows = data as TrackingResult[] | null;

      if (!rows || rows.length === 0) {
        setErrorMessage(
          "لم يتم العثور على شحنة بهذا الرقم. تأكد من الرقم وحاول مجدداً.",
        );
        return;
      }

      setTrackingNumber(normalizedNumber);
      setResult(rows[0]);
    } catch (error) {
      console.error("Tracking lookup failed:", error);
      setErrorMessage(
        "تعذر البحث عن الشحنة. حاول مرة أخرى.",
      );
    } finally {
      setSearching(false);
    }
  }

  const isDelivered = result?.current_status_code === "delivered";

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
            disabled={searching}
          />

          <button type="submit" disabled={searching}>
            {searching ? (
              <LoaderCircle
                className="animate-spin"
                size={18}
              />
            ) : (
              "تتبع الشحنة"
            )}
          </button>
        </form>

        {errorMessage && (
          <p className="customer-error">
            {errorMessage}
          </p>
        )}

        {result && (
          <article className="customer-result">
            {isDelivered ? (
              <CheckCircle2 size={28} className="text-emerald-500" />
            ) : (
              <Box size={28} />
            )}

            <div>
              <span>رقم الشحنة</span>

              <strong dir="ltr">
                {result.tracking_number}
              </strong>

              <p
                className={
                  isDelivered
                    ? "font-semibold text-emerald-700"
                    : ""
                }
              >
                {statusLabels[result.current_status_code] ||
                  result.current_status_code}
              </p>

              {result.recipient_governorate && (
                <p className="mt-1 text-sm opacity-70">
                  <MapPin
                    size={14}
                    className="inline-block"
                  />{" "}
                  {result.recipient_governorate}
                </p>
              )}

              {result.item_description && (
                <p className="mt-1 text-sm opacity-70">
                  {result.item_description}
                  {result.pieces_count && result.pieces_count > 1
                    ? ` — ${result.pieces_count} قطع`
                    : ""}
                </p>
              )}

              <p className="mt-2 text-xs opacity-50">
                آخر تحديث: {formatDate(result.updated_at)}
              </p>
            </div>
          </article>
        )}

        {result && result.current_status_code !== "delivered" && (
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <XCircle size={13} />
            لم يتم التسليم بعد
          </p>
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
