import {
  AlertCircle,
  BanknoteArrowDown,
  ClipboardPlus,
  HandCoins,
  LoaderCircle,
  Receipt,
  Save,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../contexts/AuthContext";
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

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");

  const defaultBranchId =
    profile?.role === "branch_manager" || profile?.role === "branch_employee"
      ? profile.branchId || ""
      : "";

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

      const mapped: ExpenseRow[] = (expensesResponse.data || []).map((row) => ({
        id: String(row.id),
        branchId: String((row as { branch_id?: unknown }).branch_id || ""),
        branchName: String(
          ((row as { branches?: { name?: unknown } | null }).branches?.name) || "Unknown Branch",
        ),
        category: normalizeCategory((row as { category?: unknown }).category),
        description: String((row as { description?: unknown }).description || ""),
        amount: Number((row as { amount?: unknown }).amount || 0),
        date: String((row as { date?: unknown }).date || ""),
      }));

      setRows(mapped);
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

  // Keep form branchId in sync when profile loads
  useEffect(() => {
    if (profile?.role === "branch_manager" && profile.branchId) {
      setForm((current) => ({ ...current, branchId: profile.branchId! }));
    }
  }, [profile?.branchId, profile?.role]);

  const visibleRows = useMemo(() => {
    if (categoryFilter === "all") return rows;
    return rows.filter((row) => row.category === categoryFilter);
  }, [categoryFilter, rows]);

  const total = useMemo(() => {
    return visibleRows.reduce((sum, row) => sum + row.amount, 0);
  }, [visibleRows]);

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
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          branch_id: form.branchId,
          category: form.category,
          description: form.description.trim(),
          amount,
          date: form.date,
          created_by: profile?.id || null,
        })
        .select("id, branch_id, category, description, amount, date, branches(name)")
        .single();

      if (error) throw error;

      const newRow: ExpenseRow = {
        id: String(data.id),
        branchId: String((data as { branch_id?: unknown }).branch_id || ""),
        branchName: String(
          ((data as { branches?: { name?: unknown } | null }).branches?.name) || "Unknown Branch",
        ),
        category: normalizeCategory((data as { category?: unknown }).category),
        description: String((data as { description?: unknown }).description || ""),
        amount: Number((data as { amount?: unknown }).amount || 0),
        date: String((data as { date?: unknown }).date || ""),
      };

      setRows((current) => [newRow, ...current]);
      setForm((current) => ({ ...current, description: "", amount: "" }));
      setSuccessMessage("Expense recorded successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save expense:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to save expense: ${error.message}` : "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    const confirmed = window.confirm("Delete this expense? This cannot be undone.");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      setRows((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      console.error("Failed to delete expense:", error);
      setErrorMessage(
        error instanceof Error ? `Failed to delete: ${error.message}` : "Failed to delete expense.",
      );
    }
  }

  const isBranchLocked =
    profile?.role === "branch_manager" || profile?.role === "branch_employee";

  return (
    <section className="space-y-6" dir="ltr">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          Finance
        </span>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">Expenses</h1>
        <p className="mt-2 text-sm text-gray-500">
          Record and track branch/company operational expenses with categories and amounts.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <BanknoteArrowDown size={18} />
          </div>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total.toFixed(3)} OMR</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <HandCoins size={18} />
          </div>
          <p className="text-sm text-gray-500">Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visibleRows.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Receipt size={18} />
          </div>
          <p className="text-sm text-gray-500">Largest Expense</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {(Math.max(...visibleRows.map((row) => row.amount), 0) || 0).toFixed(3)} OMR
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardPlus className="text-rose-600" size={18} />
            <h2 className="text-base font-bold text-gray-900">Record Expense</h2>
          </div>

          {successMessage && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {successMessage}
            </p>
          )}

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Branch</span>
              <select
                value={form.branchId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    branchId: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                disabled={isBranchLocked}
                required
              >
                <option value="">— Select branch —</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as ExpenseCategory,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
              >
                {Object.entries(categoryLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Description</span>
              <input
                type="text"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Amount (OMR)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
            Save Expense
          </button>
        </form>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">Expense Ledger</h2>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as ExpenseCategory | "all")}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-gray-500">
                <LoaderCircle className="animate-spin" size={18} />
                Loading expenses...
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                        <td className="px-5 py-4 text-gray-700">{row.branchName}</td>
                        <td className="px-5 py-4 text-gray-700">{categoryLabel[row.category]}</td>
                        <td className="px-5 py-4 text-gray-700">{row.description}</td>
                        <td className="px-5 py-4 text-gray-700">{row.date}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{row.amount.toFixed(3)} OMR</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => void removeExpense(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
