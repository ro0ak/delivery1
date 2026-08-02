import {
  Building2,
  Cog,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings2,
  Wallet,
} from "lucide-react";
import { useState, type FormEvent } from "react";

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

export default function SettingsPage() {
  const [general, setGeneral] = useState<GeneralSettings>({
    companyName: "ROCK Delivery",
    domain: "RO0CK.online",
    supportEmail: "support@ro0ck.online",
    supportPhone: "+968 90000000",
    headquarters: "Muscat, Oman",
  });

  const [pricing, setPricing] = useState<PricingSettings>({
    baseRate: "1.500",
    perKgRate: "0.250",
    codFee: "0.300",
    vatPercent: "5",
    returnFee: "1.000",
  });

  const [saved, setSaved] = useState(false);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          Global Configuration
        </span>

        <h1 className="mt-3 text-2xl font-bold text-gray-950">Settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configure company profile, system defaults, and shipping pricing rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="text-violet-700" size={18} />
            <h2 className="text-base font-bold text-gray-900">Company Information</h2>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Company Name</span>
              <div className="relative">
                <Cog className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
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
                  required
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
                  required
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
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Save size={16} />
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
