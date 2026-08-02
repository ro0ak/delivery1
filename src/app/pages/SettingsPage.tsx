import {
  Building2,
  Cog,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../utils/supabase";

interface GeneralSettings {
  companyName: string;
  domain: string;
  supportEmail: string;
  supportPhone: string;
  headquarters: string;
}

interface PricingSettings {
  baseRate: string;
  perKgRate: string;
  codFee: string;
  vatPercent: string;
  returnFee: string;
}

const defaultGeneral: GeneralSettings = {
  companyName: "ROCK Delivery",
  domain: "RO0CK.online",
  supportEmail: "support@ro0ck.online",
  supportPhone: "+968 90000000",
  headquarters: "Muscat, Oman",
};

const defaultPricing: PricingSettings = {
  baseRate: "1.500",
  perKgRate: "0.250",
  codFee: "0.300",
  vatPercent: "5",
  returnFee: "1.000",
};

export default function SettingsPage() {
  const { profile } = useAuth();

  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);
  const [pricing, setPricing] = useState<PricingSettings>(defaultPricing);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["general", "pricing"]);

      if (error) throw error;

      for (const row of data || []) {
        if (row.key === "general" && row.value && typeof row.value === "object") {
          setGeneral((current) => ({
            ...current,
            ...(row.value as Partial<GeneralSettings>),
          }));
        }
        if (row.key === "pricing" && row.value && typeof row.value === "object") {
          setPricing((current) => ({
            ...current,
            ...(row.value as Partial<PricingSettings>),
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load settings: ${error.message}` : "Failed to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Settings | ROCK Delivery";
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setSaved(false);
    setErrorMessage("");

    try {
      const { error } = await supabase.from("system_settings").upsert(
        [
          {
            key: "general",
            value: general,
            updated_by: profile?.id || null,
            updated_at: new Date().toISOString(),
          },
          {
            key: "pricing",
            value: pricing,
            updated_by: profile?.id || null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "key" },
      );

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to save settings: ${error.message}` : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-gray-500">
        <LoaderCircle className="animate-spin" size={18} />
        Loading settings…
      </div>
    );
  }

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          System
        </span>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">Settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Company information, pricing rules, and system configuration. Saved to Supabase.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Cog className="text-violet-700" size={18} />
            <h2 className="text-base font-bold text-gray-900">General Information</h2>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Company Name</span>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={general.companyName}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-red-600"
                  required
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Domain</span>
              <div className="relative">
                <Settings2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={general.domain}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      domain: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-red-600"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Support Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="email"
                  value={general.supportEmail}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      supportEmail: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-red-600"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Support Phone</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={general.supportPhone}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      supportPhone: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-red-600"
                  required
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Headquarters</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={general.headquarters}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      headquarters: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-red-600"
                  required
                />
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="text-violet-700" size={18} />
            <h2 className="text-base font-bold text-gray-900">Shipping Pricing Rules</h2>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Base Shipment Rate (OMR)</span>
              <input
                type="number"
                step="0.001"
                value={pricing.baseRate}
                onChange={(event) =>
                  setPricing((current) => ({
                    ...current,
                    baseRate: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Per KG Rate (OMR)</span>
              <input
                type="number"
                step="0.001"
                value={pricing.perKgRate}
                onChange={(event) =>
                  setPricing((current) => ({
                    ...current,
                    perKgRate: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">COD Fee (OMR)</span>
              <input
                type="number"
                step="0.001"
                value={pricing.codFee}
                onChange={(event) =>
                  setPricing((current) => ({
                    ...current,
                    codFee: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">VAT (%)</span>
              <input
                type="number"
                step="0.01"
                value={pricing.vatPercent}
                onChange={(event) =>
                  setPricing((current) => ({
                    ...current,
                    vatPercent: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Return Shipment Fee (OMR)</span>
              <input
                type="number"
                step="0.001"
                value={pricing.returnFee}
                onChange={(event) =>
                  setPricing((current) => ({
                    ...current,
                    returnFee: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>
          </div>
        </div>

        <div className="xl:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
            Save Settings
          </button>

          {saved && (
            <span className="ml-3 inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Settings updated successfully.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
