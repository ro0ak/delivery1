import {
  AlertCircle,
  CalendarRange,
  CircleDollarSign,
  Filter,
  HandCoins,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import ConfirmationDialog from "../components/erp/ConfirmationDialog";
import TablePagination from "../components/erp/TablePagination";
import { useAuth } from "../contexts/AuthContext";
import {
  DEFAULT_PAGE_SIZE,
  formatDate,
  formatMoney,
  matchesSearch,
  paginateRows,
} from "../lib/erp";
import { supabase } from "../../utils/supabase";

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
  notes: string | null;
}

interface CollectionFormState {
  branchId: string;
  source: CollectionSource;
  sourceName: string;
  amount: string;
  date: string;
  status: CollectionStatus;
  notes: string;
}

interface BranchOption {
  id: string;
  name: string;
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

const emptyForm: CollectionFormState = {
  branchId: "",
  source: "driver",
  sourceName: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  status: "pending",
  notes: "",
};

function isValidStatus(value: unknown): value is CollectionStatus {
  return value === "pending" || value === "verified" || value === "settled";
}

function isValidSource(value: unknown): value is CollectionSource {
  return value === "driver" || value === "merchant";
}

export default function CollectionsPage() {
  const { profile } = useAuth();

  const defaultBranchId =
    profile?.role === "branch_manager" || profile?.role === "accountant"
      ? profile.branchId || ""
      : "";

  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<CollectionSource | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CollectionRow | null>(null);
  const [rowToDelete, setRowToDelete] = useState<CollectionRow | null>(null);
  const [form, setForm] = useState<CollectionFormState>({
    ...emptyForm,
    branchId: defaultBranchId,
  });

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [collectionsResponse, branchesResponse] = await Promise.all([
        supabase
          .from("collections")
          .select("id, branch_id, source, source_name, amount, date, status, notes, branches(name)")
          .order("date", { ascending: false }),
        supabase.from("branches").select("id,name").order("name", { ascending: true }),
      ]);

      if (collectionsResponse.error) {
        throw collectionsResponse.error;
      }

      if (branchesResponse.error) {
        throw branchesResponse.error;
      }

      setRows(
        (collectionsResponse.data || []).map((row) => ({
          id: String(row.id),
          branchId: String((row as { branch_id?: unknown }).branch_id || ""),
          branchName: String(((row as { branches?: { name?: unknown } | null }).branches?.name) || "Unknown Branch"),
          source: isValidSource((row as { source?: unknown }).source) ? row.source : "driver",
          sourceName: String((row as { source_name?: unknown }).source_name || ""),
          amount: Number((row as { amount?: unknown }).amount || 0),
          date: String((row as { date?: unknown }).date || ""),
          status: isValidStatus((row as { status?: unknown }).status) ? row.status : "pending",
          notes: ((row as { notes?: string | null }).notes || null) as string | null,
        })),
      );
      setBranches((branchesResponse.data || []) as BranchOption[]);
    } catch (error) {
      console.error("Failed to load collections:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load collections: ${error.message}` : "Failed to load collections.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Collections | ROCK Delivery";
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (defaultBranchId) {
      setForm((current) => ({ ...current, branchId: current.branchId || defaultBranchId }));
    }
  }, [defaultBranchId]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, dateFrom, dateTo, searchQuery, sourceFilter, statusFilter]);

  const visibleCollections = useMemo(() => {
    return rows.filter((row) => {
      if (branchFilter !== "all" && row.branchId !== branchFilter) {
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

      return matchesSearch([row.id, row.sourceName, row.branchName, row.notes], searchQuery);
    });
  }, [branchFilter, dateFrom, dateTo, rows, searchQuery, sourceFilter, statusFilter]);

  const paginated = useMemo(() => paginateRows(visibleCollections, page, pageSize), [page, pageSize, visibleCollections]);

  const totals = useMemo(
    () => ({
      total: visibleCollections.reduce((sum, row) => sum + row.amount, 0),
      pending: visibleCollections.filter((row) => row.status === "pending").reduce((sum, row) => sum + row.amount, 0),
      settled: visibleCollections.filter((row) => row.status === "settled").reduce((sum, row) => sum + row.amount, 0),
    }),
    [visibleCollections],
  );

  function openCreateForm() {
    setEditingRow(null);
    setForm({ ...emptyForm, branchId: defaultBranchId });
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(row: CollectionRow) {
    setEditingRow(row);
    setForm({
      branchId: row.branchId,
      source: row.source,
      sourceName: row.sourceName,
      amount: String(row.amount),
      date: row.date,
      status: row.status,
      notes: row.notes || "",
    });
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingRow(null);
    setForm({ ...emptyForm, branchId: defaultBranchId });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const amount = Number(form.amount);

    if (!form.branchId || !form.sourceName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Please fill in all required collection fields with valid values.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        branch_id: form.branchId,
        source: form.source,
        source_name: form.sourceName.trim(),
        amount,
        date: form.date,
        status: form.status,
        notes: form.notes.trim() || null,
        created_by: profile?.id || null,
      };

      if (editingRow) {
        const { error } = await supabase.from("collections").update(payload).eq("id", editingRow.id);

        if (error) {
          throw error;
        }

        setSuccessMessage("Collection updated successfully.");
      } else {
        const { error } = await supabase.from("collections").insert(payload);

        if (error) {
          throw error;
        }

        setSuccessMessage("Collection created successfully.");
      }

      closeForm();
      await loadCollections();
    } catch (error) {
      console.error("Failed to save collection:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to save collection: ${error.message}` : "Failed to save collection.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteCollection() {
    if (!rowToDelete || deletingId) {
      return;
    }

    setDeletingId(rowToDelete.id);

    try {
      const { error } = await supabase.from("collections").delete().eq("id", rowToDelete.id);

      if (error) {
        throw error;
      }

      setRows((current) => current.filter((row) => row.id !== rowToDelete.id));
      setRowToDelete(null);
      setSuccessMessage("Collection deleted successfully.");
    } catch (error) {
      console.error("Failed to delete collection:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to delete collection: ${error.message}` : "Failed to delete collection.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const isBranchLocked = profile?.role === "branch_manager" || profile?.role === "accountant";

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Finance
            </span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">Collections</h1>
            <p className="mt-2 text-sm text-gray-500">
              Track, verify, and settle live cash collections from drivers and merchants.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCollections()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              <Plus size={16} />
              Add Collection
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CircleDollarSign size={18} />
          </div>
          <p className="text-sm text-gray-500">Total Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(totals.total)}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <HandCoins size={18} />
          </div>
          <p className="text-sm text-gray-500">Pending Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(totals.pending)}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <ReceiptText size={18} />
          </div>
          <p className="text-sm text-gray-500">Settled Collections</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(totals.settled)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by source, note, or reference"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600"
            />
          </label>

          <label className="space-y-1 xl:col-span-1">
            <span className="text-xs font-semibold text-gray-500">Branch</span>
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-red-600"
              disabled={isBranchLocked}
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 xl:col-span-1">
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

          <label className="space-y-1 xl:col-span-1">
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
            <span className="text-xs font-semibold text-gray-500">From</span>
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
            <span className="text-xs font-semibold text-gray-500">To</span>
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

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading collections...
          </div>
        ) : visibleCollections.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center">
            <ReceiptText className="text-gray-300" size={36} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">No collections found</h2>
              <p className="mt-1 text-sm text-gray-500">Try adjusting the filters or add a new collection entry.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-900">{row.id.slice(0, 8)}…</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{row.branchName}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[row.status]}`}>
                      {statusLabel[row.status]}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-3">
                      <dt>Source</dt>
                      <dd className="font-medium text-gray-900">{sourceLabel[row.source]} — {row.sourceName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Date</dt>
                      <dd className="font-medium text-gray-900">{formatDate(row.date)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Amount</dt>
                      <dd className="font-medium text-gray-900">{formatMoney(row.amount)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => openEditForm(row)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => setRowToDelete(row)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Notes</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-900">{row.id.slice(0, 8)}…</td>
                      <td className="px-5 py-4 text-gray-700">{row.branchName}</td>
                      <td className="px-5 py-4 text-gray-700">{sourceLabel[row.source]} — {row.sourceName}</td>
                      <td className="px-5 py-4 text-gray-700">{formatDate(row.date)}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{formatMoney(row.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[row.status]}`}>
                          {statusLabel[row.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{row.notes || "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditForm(row)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <Pencil size={14} /> Edit
                          </button>
                          <button type="button" onClick={() => setRowToDelete(row)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={paginated.page}
              pageSize={pageSize}
              totalItems={visibleCollections.length}
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeForm();
          }
        }}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingRow ? "Edit Collection" : "Add Collection"}</h2>
              <button type="button" onClick={closeForm} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Branch</span>
                  <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" disabled={isBranchLocked} required>
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Source</span>
                  <select value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as CollectionSource }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600">
                    <option value="driver">Driver</option>
                    <option value="merchant">Merchant</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Source Name</span>
                  <input type="text" value={form.sourceName} onChange={(event) => setForm((current) => ({ ...current, sourceName: event.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Amount (OMR)</span>
                  <input type="number" min="0" step="0.001" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Date</span>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CollectionStatus }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600">
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="settled">Settled</option>
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Notes</span>
                  <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-red-600" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">
                  {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(rowToDelete)}
        title="Delete collection"
        description={`Delete collection ${rowToDelete?.id.slice(0, 8) || ""} from Supabase?`}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        destructive
        busy={Boolean(deletingId)}
        onConfirm={() => void confirmDeleteCollection()}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setRowToDelete(null);
          }
        }}
      />
    </section>
  );
}
