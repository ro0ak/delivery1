import {
  CalendarRange,
  CircleDollarSign,
  Filter,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

type CollectionStatus = "pending" | "verified" | "settled";
type CollectionSource = "driver" | "merchant";

interface CollectionRow {
  id: string;
  branchId: string;
  branchName: string;
  source: CollectionSource;
  sourceName: string;
  amount: number;
  date: string;
  status: CollectionStatus;
}

const statusLabel: Record<CollectionStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  settled: "Settled",
};

const statusClasses: Record<CollectionStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-sky-50 text-sky-700",
  settled: "bg-emerald-50 text-emerald-700",
};

const sourceLabel: Record<CollectionSource, string> = {
  driver: "Driver",
  merchant: "Merchant",
};

const initialCollections: CollectionRow[] = [
  {
    id: "COL-001",
    branchId: "muscat",
    branchName: "Muscat Branch",
    source: "driver",
    sourceName: "Ahmed Salim",
    amount: 184.5,
    date: "2026-08-01",
    status: "pending",
  },
  {
    id: "COL-002",
    branchId: "muscat",
    branchName: "Muscat Branch",
    source: "merchant",
    sourceName: "Nizwa Electronics",
    amount: 320,
    date: "2026-08-01",
    status: "verified",
  },
  {
    id: "COL-003",
    branchId: "sohar",
    branchName: "Sohar Branch",
    source: "driver",
    sourceName: "Saif Al Balushi",
    amount: 96,
    date: "2026-07-31",
    status: "settled",
  },
];

export default function CollectionsPage() {
  const { profile } = useAuth();

  const [rows] = useState<CollectionRow[]>(initialCollections);
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<CollectionSource | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const visibleCollections = useMemo(() => {
    return rows.filter((row) => {
      if (profile?.role === "branch_manager" && profile.branchId && row.branchId !== profile.branchId) {
        return false;
      }

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (sourceFilter !== "all" && row.source !== sourceFilter) {
        return false;
      }

      if (dateFrom && row.date < dateFrom) {
        return false;
      }

      if (dateTo && row.date > dateTo) {
        return false;
      }

      return true;
    });
  }, [dateFrom, dateTo, profile?.branchId, profile?.role, rows, sourceFilter, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: visibleCollections.reduce((sum, row) => sum + row.amount, 0),
      pending: visibleCollections
        .filter((row) => row.status === "pending")
        .reduce((sum, row) => sum + row.amount, 0),
      settled: visibleCollections
        .filter((row) => row.status === "settled")
        .reduce((sum, row) => sum + row.amount, 0),
    };
  }, [visibleCollections]);

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Finance
        </span>

        <h1 className="mt-3 text-2xl font-bold text-gray-950">Collections</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track cash collections from drivers and merchants with status and date filters.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CircleDollarSign size={18} />
          </div>
          <p className="text-sm text-gray-500">Total Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.total.toFixed(3)} OMR</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <HandCoins size={18} />
          </div>
          <p className="text-sm text-gray-500">Pending Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.pending.toFixed(3)} OMR</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <ReceiptText size={18} />
          </div>
          <p className="text-sm text-gray-500">Settled Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.settled.toFixed(3)} OMR</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">Status</span>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as CollectionStatus | "all")}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">Source</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as CollectionSource | "all")}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600"
            >
              <option value="all">All Sources</option>
              <option value="driver">Driver</option>
              <option value="merchant">Merchant</option>
            </select>
          </label>

          <label className="space-y-1 xl:col-span-1">
            <span className="text-xs font-semibold text-gray-500">From Date</span>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600"
              />
            </div>
          </label>

          <label className="space-y-1 xl:col-span-1">
            <span className="text-xs font-semibold text-gray-500">To Date</span>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600"
              />
            </div>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleCollections.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                  <td className="px-5 py-4 font-semibold text-gray-900">{row.id}</td>
                  <td className="px-5 py-4 text-gray-700">{row.branchName}</td>
                  <td className="px-5 py-4 text-gray-700">
                    {sourceLabel[row.source]} - {row.sourceName}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{row.date}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{row.amount.toFixed(3)} OMR</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[row.status]}`}>
                      {statusLabel[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
