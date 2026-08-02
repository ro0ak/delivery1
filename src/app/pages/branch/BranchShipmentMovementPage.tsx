import {
  ArrowDownToLine,
  ArrowUpFromLine,
  LoaderCircle,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TablePagination from "../../components/erp/TablePagination";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import {
  DEFAULT_PAGE_SIZE,
  formatDate,
  matchesSearch,
  paginateRows,
} from "../../lib/erp";
import { supabase } from "../../../utils/supabase";

interface ShipmentRow {
  id: string;
  tracking_number: string;
  sender_name: string;
  recipient_name: string;
  current_status_code: string;
  origin_branch_id: string | null;
  destination_branch_id: string | null;
  current_branch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BranchOption {
  id: string;
  name: string;
}

const activeStatuses = ["created", "received_destination", "assigned", "on_delivery", "out_for_delivery"];

export default function BranchShipmentMovementPage() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [movementFilter, setMovementFilter] = useState<"all" | "incoming" | "outgoing" | "at_branch">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const activeBranchId = profile?.branchId || selectedBranchId;

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: branchRows, error: branchError } = await supabase
        .from("branches")
        .select("id,name")
        .order("name", { ascending: true });

      if (branchError) {
        throw branchError;
      }

      setBranches((branchRows || []) as BranchOption[]);

      const resolvedBranchId = profile?.branchId || selectedBranchId || branchRows?.[0]?.id;

      if (!profile?.branchId && resolvedBranchId && resolvedBranchId !== selectedBranchId) {
        setSelectedBranchId(resolvedBranchId);
      }

      if (!resolvedBranchId) {
        setShipments([]);
        return;
      }

      const { data, error } = await supabase
        .from("shipments")
        .select(
          "id,tracking_number,sender_name,recipient_name,current_status_code,origin_branch_id,destination_branch_id,current_branch_id,created_at,updated_at",
        )
        .or(
          `origin_branch_id.eq.${resolvedBranchId},destination_branch_id.eq.${resolvedBranchId},current_branch_id.eq.${resolvedBranchId}`,
        )
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setShipments((data || []) as ShipmentRow[]);
    } catch (error) {
      console.error("Failed to load branch shipment movement:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load shipment movement: ${error.message}` : "Failed to load shipment movement.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.branchId, selectedBranchId]);

  useEffect(() => {
    document.title = "Branch Shipment Movement | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useAutoRefresh(loadData, 60000, Boolean(activeBranchId));

  useEffect(() => {
    setPage(1);
  }, [movementFilter, searchQuery, statusFilter]);

  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);

  const visibleRows = useMemo(() => {
    return shipments.filter((shipment) => {
      const branchId = activeBranchId;
      if (!branchId) return false;

      const isIncoming = shipment.destination_branch_id === branchId;
      const isOutgoing = shipment.origin_branch_id === branchId;
      const isAtBranch = shipment.current_branch_id === branchId && shipment.current_status_code !== "delivered";

      if (movementFilter === "incoming" && !isIncoming) return false;
      if (movementFilter === "outgoing" && !isOutgoing) return false;
      if (movementFilter === "at_branch" && !isAtBranch) return false;
      if (statusFilter !== "all" && shipment.current_status_code !== statusFilter) return false;

      return matchesSearch(
        [shipment.tracking_number, shipment.sender_name, shipment.recipient_name],
        searchQuery,
      );
    });
  }, [activeBranchId, movementFilter, searchQuery, shipments, statusFilter]);

  const paginated = useMemo(() => paginateRows(visibleRows, page, pageSize), [page, pageSize, visibleRows]);

  const stats = useMemo(() => {
    const branchId = activeBranchId;
    return {
      incoming: shipments.filter((shipment) => shipment.destination_branch_id === branchId).length,
      outgoing: shipments.filter((shipment) => shipment.origin_branch_id === branchId).length,
      atBranch: shipments.filter((shipment) => shipment.current_branch_id === branchId && shipment.current_status_code !== "delivered").length,
      active: shipments.filter((shipment) => activeStatuses.includes(shipment.current_status_code)).length,
    };
  }, [activeBranchId, shipments]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">لوحة الفرع</span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">حركة الشحنات</h1>
            <p className="mt-2 text-sm text-gray-500">متابعة الشحنات الواردة والصادرة والموجودة حاليًا داخل نطاق الفرع.</p>
          </div>

          {!profile?.branchId && (
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-600"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ArrowDownToLine} label="الواردة" value={stats.incoming} tone="sky" />
        <StatCard icon={ArrowUpFromLine} label="الصادرة" value={stats.outgoing} tone="amber" />
        <StatCard icon={PackageCheck} label="داخل الفرع" value={stats.atBranch} tone="emerald" />
        <StatCard icon={Truck} label="الحركة النشطة" value={stats.active} tone="red" />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث برقم التتبع أو المرسل أو المستلم"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-red-600"
            />
          </label>
          <select value={movementFilter} onChange={(event) => setMovementFilter(event.target.value as typeof movementFilter)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600">
            <option value="all">كل الحركات</option>
            <option value="incoming">واردة</option>
            <option value="outgoing">صادرة</option>
            <option value="at_branch">داخل الفرع</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600">
            <option value="all">كل الحالات</option>
            {[...new Set(shipments.map((shipment) => shipment.current_status_code))].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} /> جاري التحميل...
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-gray-500">لا توجد شحنات مطابقة للفلتر الحالي.</div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((shipment) => (
                <article key={shipment.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-900">{shipment.tracking_number}</p>
                      <p className="mt-1 text-xs text-gray-500">{shipment.current_status_code}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{formatDate(shipment.updated_at)}</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-3"><dt>المرسل</dt><dd className="font-medium text-gray-900">{shipment.sender_name}</dd></div>
                    <div className="flex justify-between gap-3"><dt>المستلم</dt><dd className="font-medium text-gray-900">{shipment.recipient_name}</dd></div>
                    <div className="flex justify-between gap-3"><dt>من</dt><dd className="font-medium text-gray-900">{shipment.origin_branch_id ? branchMap.get(shipment.origin_branch_id) || "—" : "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt>إلى</dt><dd className="font-medium text-gray-900">{shipment.destination_branch_id ? branchMap.get(shipment.destination_branch_id) || "—" : "—"}</dd></div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-5 py-3">رقم التتبع</th>
                    <th className="px-5 py-3">المرسل</th>
                    <th className="px-5 py-3">المستلم</th>
                    <th className="px-5 py-3">من</th>
                    <th className="px-5 py-3">إلى</th>
                    <th className="px-5 py-3">الحالة</th>
                    <th className="px-5 py-3">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((shipment) => (
                    <tr key={shipment.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-900">{shipment.tracking_number}</td>
                      <td className="px-5 py-4 text-gray-700">{shipment.sender_name}</td>
                      <td className="px-5 py-4 text-gray-700">{shipment.recipient_name}</td>
                      <td className="px-5 py-4 text-gray-700">{shipment.origin_branch_id ? branchMap.get(shipment.origin_branch_id) || "—" : "—"}</td>
                      <td className="px-5 py-4 text-gray-700">{shipment.destination_branch_id ? branchMap.get(shipment.destination_branch_id) || "—" : "—"}</td>
                      <td className="px-5 py-4 text-gray-700">{shipment.current_status_code}</td>
                      <td className="px-5 py-4 text-gray-700">{formatDate(shipment.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={paginated.page}
              pageSize={pageSize}
              totalItems={visibleRows.length}
              totalPages={paginated.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  value: number;
  tone: "sky" | "amber" | "emerald" | "red";
}) {
  const toneClasses = {
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
