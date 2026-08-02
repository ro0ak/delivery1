import {
  AlertCircle,
  BanknoteArrowDown,
  CheckCircle2,
  ClipboardPlus,
  HandCoins,
  LoaderCircle,
  Pencil,
  Receipt,
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

type ExpenseCategory =
  | "rent"
  | "fuel"
  | "maintenance"
  | "salary"
  | "utilities"
  | "other";

interface ExpenseRow {
  id: string;
  branchId: string;
  branchName: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface ExpenseFormState {
  branchId: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  date: string;
}

const categoryLabel: Record<ExpenseCategory, string> = {
  rent: "Rent",
  fuel: "Fuel",
  maintenance: "Maintenance",
  salary: "Salary",
  utilities: "Utilities",
  other: "Other",
};

const knownCategories = Object.keys(categoryLabel) as ExpenseCategory[];

function normalizeCategory(value: unknown): ExpenseCategory {
  if (typeof value === "string" && knownCategories.includes(value as ExpenseCategory)) {
    return value as ExpenseCategory;
  }
  return "other";
}

export default function ExpensesPage() {
  const { profile } = useAuth();

  const defaultBranchId =
    profile?.role === "branch_manager" || profile?.role === "branch_employee" || profile?.role === "accountant"
      ? profile.branchId || ""
      : "";

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ExpenseRow | null>(null);
  const [rowToDelete, setRowToDelete] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseFormState>({
    branchId: defaultBranchId,
    category: "other",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [expensesResponse, branchesResponse] = await Promise.all([
        supabase
          .from("expenses")
          .select("id, branch_id, category, description, amount, date, branches(name)")
          .order("date", { ascending: false }),
        supabase.from("branches").select("id, name").order("name"),
      ]);

      if (expensesResponse.error) throw expensesResponse.error;
      if (branchesResponse.error) throw branchesResponse.error;

      setRows(
        (expensesResponse.data || []).map((row) => ({
          id: String(row.id),
          branchId: String((row as { branch_id?: unknown }).branch_id || ""),
          branchName: String(((row as { branches?: { name?: unknown } | null }).branches?.name) || "Unknown Branch"),
          category: normalizeCategory((row as { category?: unknown }).category),
          description: String((row as { description?: unknown }).description || ""),
          amount: Number((row as { amount?: unknown }).amount || 0),
          date: String((row as { date?: unknown }).date || ""),
        })),
      );
      setBranches((branchesResponse.data || []) as BranchOption[]);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to load expenses: ${error.message}` : "Failed to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Expenses | ROCK Delivery";
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (defaultBranchId) {
      setForm((current) => ({ ...current, branchId: current.branchId || defaultBranchId }));
    }
  }, [defaultBranchId]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, categoryFilter, searchQuery]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (branchFilter !== "all" && row.branchId !== branchFilter) return false;
      return matchesSearch([row.description, row.branchName, row.date], searchQuery);
    });
  }, [branchFilter, categoryFilter, rows, searchQuery]);

  const paginated = useMemo(() => paginateRows(visibleRows, page, pageSize), [page, pageSize, visibleRows]);

  const summary = useMemo(
    () => ({
      total: visibleRows.reduce((sum, row) => sum + row.amount, 0),
      entries: visibleRows.length,
      largest: Math.max(...visibleRows.map((row) => row.amount), 0),
    }),
    [visibleRows],
  );

  function openCreateForm() {
    setEditingRow(null);
    setForm({
      branchId: defaultBranchId,
      category: "other",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(row: ExpenseRow) {
    setEditingRow(row);
    setForm({
      branchId: row.branchId,
      category: row.category,
      description: row.description,
      amount: String(row.amount),
      date: row.date,
    });
    setFormOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingRow(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const amount = Number(form.amount);

    if (!form.branchId) {
      setErrorMessage("Please select a branch.");
      return;
    }

    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Please fill in all required fields with valid values.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        branch_id: form.branchId,
        category: form.category,
        description: form.description.trim(),
        amount,
        date: form.date,
        created_by: profile?.id || null,
      };

      if (editingRow) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editingRow.id);
        if (error) throw error;
        setSuccessMessage("Expense updated successfully.");
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
        setSuccessMessage("Expense recorded successfully.");
      }

      closeForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save expense:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to save expense: ${error.message}` : "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteExpense() {
    if (!rowToDelete || deletingId) return;

    setDeletingId(rowToDelete.id);

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", rowToDelete.id);
      if (error) throw error;

      setRows((current) => current.filter((row) => row.id !== rowToDelete.id));
      setRowToDelete(null);
      setSuccessMessage("Expense deleted successfully.");
    } catch (error) {
      console.error("Failed to delete expense:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to delete expense: ${error.message}` : "Failed to delete expense.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const isBranchLocked =
    profile?.role === "branch_manager" || profile?.role === "branch_employee" || profile?.role === "accountant";

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Finance
            </span>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">Expenses</h1>
            <p className="mt-2 text-sm text-gray-500">
              Record, update, and remove live branch and company expense entries.
            </p>
          </div>

          <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800">
            <ClipboardPlus size={18} />
            Add Expense
          </button>
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
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <BanknoteArrowDown size={18} />
          </div>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(summary.total)}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <HandCoins size={18} />
          </div>
          <p className="text-sm text-gray-500">Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary.entries}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Receipt size={18} />
          </div>
          <p className="text-sm text-gray-500">Largest Expense</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(summary.largest)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-100 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by description, branch, or date"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600"
            />
          </label>

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
            disabled={isBranchLocked}
          >
            <option value="all">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as ExpenseCategory | "all")}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading expenses...
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center">
            <Receipt className="text-gray-300" size={36} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">No expenses recorded</h2>
              <p className="mt-1 text-sm text-gray-500">Try changing the filters or add a new expense entry.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {paginated.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{row.description}</p>
                      <p className="text-xs text-gray-500">{row.branchName}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{categoryLabel[row.category]}</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
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
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                      <td className="px-5 py-4 text-gray-700">{row.branchName}</td>
                      <td className="px-5 py-4 text-gray-700">{categoryLabel[row.category]}</td>
                      <td className="px-5 py-4 text-gray-700">{row.description}</td>
                      <td className="px-5 py-4 text-gray-700">{formatDate(row.date)}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{formatMoney(row.amount)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditForm(row)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <Pencil size={14} /> Edit
                          </button>
                          <button type="button" onClick={() => setRowToDelete(row)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeForm();
          }
        }}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingRow ? "Edit Expense" : "Add Expense"}</h2>
              <button type="button" onClick={closeForm} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Branch</span>
                  <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" disabled={isBranchLocked} required>
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Category</span>
                  <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600">
                    {Object.entries(categoryLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-gray-500">Description</span>
                  <input type="text" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Amount (OMR)</span>
                  <input type="number" min="0" step="0.001" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-500">Date</span>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600" required />
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
        title="Delete expense"
        description={`Delete expense \"${rowToDelete?.description || ""}\" from Supabase?`}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        destructive
        busy={Boolean(deletingId)}
        onConfirm={() => void confirmDeleteExpense()}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setRowToDelete(null);
          }
        }}
      />
    </section>
  );
}
