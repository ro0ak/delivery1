import {
  FilePlus2,
  HandHelping,
  PackageCheck,
  PackageSearch,
  Printer,
} from "lucide-react";
import { useNavigate } from "react-router";

interface OfficeAction {
  title: string;
  description: string;
  icon: typeof FilePlus2;
  path: string;
}

const officeActions: OfficeAction[] = [
  {
    title: "New Shipment",
    description:
      "Create a new shipment with sender/receiver details and tracking number.",
    icon: FilePlus2,
    path: "/shipments/new",
  },
  {
    title: "Search Shipment",
    description:
      "Find shipment details, branch location, and current movement status.",
    icon: PackageSearch,
    path: "/shipments/search",
  },
  {
    title: "Receive Shipment",
    description:
      "Confirm arrival and register incoming shipment reception in branch.",
    icon: HandHelping,
    path: "/shipments/receive",
  },
  {
    title: "Deliver Shipment",
    description:
      "Complete delivery handover and mark shipment as delivered.",
    icon: PackageCheck,
    path: "/shipments/deliver",
  },
  {
    title: "Print Invoices",
    description:
      "Open shipment records and print customer invoices and receipts.",
    icon: Printer,
    path: "/shipments/search",
  },
];

export default function OfficeDashboardPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          Office Mode
        </span>

        <h1 className="mt-3 text-2xl font-bold text-gray-950">
          Branch Office Operations
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Access daily shipment workflows through a clean, structured control panel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {officeActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              type="button"
              key={action.title}
              onClick={() => navigate(action.path)}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 transition group-hover:bg-red-100">
                <Icon size={20} />
              </div>

              <h2 className="text-base font-semibold text-gray-900">{action.title}</h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">{action.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
