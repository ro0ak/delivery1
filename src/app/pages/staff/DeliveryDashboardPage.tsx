import {
  CircleDollarSign,
  LoaderCircle,
  MapPin,
  Package,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { formatMoney } from "../../lib/erp";
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
  assigned: "مسندة",
  on_delivery: "جارٍ التوصيل",
  out_for_delivery: "خرجت للتوصيل",
};

export default function DeliveryDashboardPage() {
  const { profile } = useAuth();
  const [assignedShipments, setAssignedShipments] = useState<AssignedShipment[]>([]);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [pricingSummary, setPricingSummary] = useState({ baseRate: "0.000", codFee: "0.000" });
  const [loading, setLoading] = useState(true);

  const loadDeliveryData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    setLoading(true);

    try {
      const [assignedResult, deliveredResult, settingsResult] = await Promise.all([
        supabase
          .from("shipments")
          .select(
            "id, tracking_number, recipient_name, recipient_phone, recipient_address, recipient_governorate, current_status_code, collection_required, collection_amount",
          )
          .eq("driver_id", profile.id)
          .in("current_status_code", ["assigned", "on_delivery", "out_for_delivery"])
          .order("created_at", { ascending: true }),
        supabase
          .from("shipments")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", profile.id)
          .eq("current_status_code", "delivered")
          .gte("updated_at", `${today}T00:00:00Z`),
        supabase.from("system_settings").select("value").eq("key", "pricing").maybeSingle(),
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

      const pricing = settingsResult.data?.value as { baseRate?: string; codFee?: string } | undefined;

      setAssignedShipments(rows);
      setDeliveredToday(deliveredResult.count ?? 0);
      setPricingSummary({
        baseRate: pricing?.baseRate || "0.000",
        codFee: pricing?.codFee || "0.000",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void loadDeliveryData();
  }, [loadDeliveryData]);

  useAutoRefresh(loadDeliveryData, 60000, Boolean(profile?.id));

  const totalDues = assignedShipments.filter((shipment) => shipment.collection_required).reduce((sum, shipment) => sum + shipment.collection_amount, 0);

  return (
    <main className="delivery-mode" dir="rtl">
      <header>
        <div>
          <span>وضع التوصيل</span>
          <h1>{profile?.fullName || "موظف التوصيل"}</h1>
        </div>
        <b>متاح</b>
      </header>

      <section className="delivery-stats">
        <article>
          <Truck size={23} />
          <span>الشحنات المسندة</span>
          <strong>{loading ? "…" : assignedShipments.length}</strong>
        </article>

        <article>
          <PackageCheck size={23} />
          <span>تم تسليمها اليوم</span>
          <strong>{loading ? "…" : deliveredToday}</strong>
        </article>

        <article>
          <CircleDollarSign size={23} />
          <span>مستحقات التحصيل</span>
          <strong>{loading ? "…" : formatMoney(totalDues, "ر.ع")}</strong>
        </article>
      </section>

      <section className="delivery-list">
        <div>
          <h2>الشحنات المسندة</h2>
          <span>{loading ? "…" : `${assignedShipments.length} شحنة`}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            <span>جاري التحميل…</span>
          </div>
        ) : assignedShipments.length === 0 ? (
          <>
            <Route size={44} />
            <strong>لا توجد مهام توصيل الآن</strong>
            <p>ستظهر هنا الشحنات التي أسندها الفرع إلى حسابك.</p>
          </>
        ) : (
          <ul className="mt-4 space-y-3">
            {assignedShipments.map((shipment) => (
              <li key={shipment.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-red-700" />
                    <span className="font-mono text-sm font-semibold text-gray-900">{shipment.tracking_number}</span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{statusLabels[shipment.current_status_code] || shipment.current_status_code}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">{shipment.recipient_name}</p>
                <p className="text-sm text-gray-500">{shipment.recipient_phone}</p>
                {(shipment.recipient_governorate || shipment.recipient_address) && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {[shipment.recipient_governorate, shipment.recipient_address].filter(Boolean).join(" — ")}
                  </p>
                )}
                {shipment.collection_required && <p className="mt-2 text-xs font-semibold text-red-700">تحصيل: {formatMoney(shipment.collection_amount, "ر.ع")}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="commission-note">
        تسعيرة النظام الحالية: أساسي {pricingSummary.baseRate} ر.ع ورسوم التحصيل {pricingSummary.codFee} ر.ع وفق إعدادات Supabase.
      </aside>
    </main>
  );
}
