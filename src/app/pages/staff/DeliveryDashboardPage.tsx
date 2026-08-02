import {
  CircleDollarSign,
  LoaderCircle,
  MapPin,
  Package,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../../utils/supabase";

interface AssignedShipment {
  id: string;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string | null;
  recipient_governorate: string | null;
  current_status_code: string;
  collection_required: boolean;
  collection_amount: number;
}

const statusLabels: Record<string, string> = {
  assigned:         "مسندة",
  on_delivery:      "جارٍ التوصيل",
  out_for_delivery: "خرجت للتوصيل",
};

export default function DeliveryDashboardPage() {
  const { profile } = useAuth();

  const [assignedShipments, setAssignedShipments] =
    useState<AssignedShipment[]>([]);

  const [deliveredToday, setDeliveredToday] =
    useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    async function loadDeliveryData() {
      setLoading(true);

      try {
        const [assignedResult, deliveredResult] =
          await Promise.all([
            // Active assigned shipments
            supabase
              .from("shipments")
              .select(
                "id, tracking_number, recipient_name, recipient_phone, recipient_address, recipient_governorate, current_status_code, collection_required, collection_amount",
              )
              .eq("driver_id", profile!.id)
              .in("current_status_code", [
                "assigned",
                "on_delivery",
                "out_for_delivery",
              ])
              .order("created_at", { ascending: true }),

            // Delivered today
            supabase
              .from("shipments")
              .select("*", { count: "exact", head: true })
              .eq("driver_id", profile!.id)
              .eq("current_status_code", "delivered")
              .gte("updated_at", `${today}T00:00:00Z`),
          ]);

        const rows = (assignedResult.data || []).map((row) => ({
          id: String(row.id),
          tracking_number: String((row as { tracking_number?: unknown }).tracking_number || ""),
          recipient_name: String((row as { recipient_name?: unknown }).recipient_name || ""),
          recipient_phone: String((row as { recipient_phone?: unknown }).recipient_phone || ""),
          recipient_address: ((row as { recipient_address?: string | null }).recipient_address) ?? null,
          recipient_governorate: ((row as { recipient_governorate?: string | null }).recipient_governorate) ?? null,
          current_status_code: String((row as { current_status_code?: unknown }).current_status_code || ""),
          collection_required: Boolean((row as { collection_required?: unknown }).collection_required),
          collection_amount: Number((row as { collection_amount?: unknown }).collection_amount || 0),
        }));

        setAssignedShipments(rows);
        setDeliveredToday(deliveredResult.count ?? 0);
      } catch (error) {
        console.error("Failed to load delivery data:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDeliveryData();
  }, [profile?.id]);

  const totalDues = assignedShipments
    .filter((s) => s.collection_required)
    .reduce((sum, s) => sum + s.collection_amount, 0);

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
            الشحنات المسندة
          </span>

          <strong>
            {loading ? "…" : assignedShipments.length}
          </strong>
        </article>

        <article>
          <PackageCheck size={23} />

          <span>
            تم تسليمها اليوم
          </span>

          <strong>
            {loading ? "…" : deliveredToday}
          </strong>
        </article>

        <article>
          <CircleDollarSign size={23} />

          <span>
            مستحقات التحصيل
          </span>

          <strong>
            {loading ? "…" : `${totalDues.toFixed(3)} ر.ع`}
          </strong>
        </article>
      </section>

      <section className="delivery-list">
        <div>
          <h2>
            الشحنات المسندة
          </h2>

          <span>
            {loading ? "…" : `${assignedShipments.length} شحنة`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            <span>جاري التحميل…</span>
          </div>
        ) : assignedShipments.length === 0 ? (
          <>
            <Route size={44} />

            <strong>
              لا توجد مهام توصيل الآن
            </strong>

            <p>
              ستظهر هنا الشحنات التي أسندها
              الفرع إلى حسابك.
            </p>
          </>
        ) : (
          <ul className="mt-4 space-y-3">
            {assignedShipments.map((shipment) => (
              <li
                key={shipment.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-red-700" />
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {shipment.tracking_number}
                    </span>
                  </div>

                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {statusLabels[shipment.current_status_code] || shipment.current_status_code}
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-gray-900">
                  {shipment.recipient_name}
                </p>

                <p className="text-sm text-gray-500">
                  {shipment.recipient_phone}
                </p>

                {(shipment.recipient_governorate || shipment.recipient_address) && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {[shipment.recipient_governorate, shipment.recipient_address]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                )}

                {shipment.collection_required && (
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    تحصيل: {shipment.collection_amount.toFixed(3)} ر.ع
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="commission-note">
        نموذج العمولة الحالي: 0.600 ر.ع
        للسائق و0.200 ر.ع للفرع عن كل
        عملية توصيل ناجحة. سيتم تعديل هذه
        القيم من إعدادات النظام لاحقًا.
      </aside>
    </main>
  );
}
