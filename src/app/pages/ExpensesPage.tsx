import {
  BanknoteArrowDown,
  ClipboardPlus,
  HandCoins,
  Receipt,
  Save,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../contexts/AuthContext";

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

interface ExpenseFormState {
  branchId: string;
  branchName: string;
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

const initialRows: ExpenseRow[] = [
  {
    id: "EXP-001",
    branchId: "muscat",
    branchName: "Muscat Branch",
    category: "fuel",
    description: "Fleet refuel",
    amount: 46.3,
    date: "2026-08-01",
  },
  {
    id: "EXP-002",
    branchId: "muscat",
    branchName: "Muscat Branch",
    category: "utilities",
    description: "Internet bill",
    amount: 25,
    date: "2026-07-31",
  },
  {
    id: "EXP-003",
    branchId: "sohar",
    branchName: "Sohar Branch",
    category: "maintenance",
    description: "Bike service",
    amount: 18,
    date: "2026-07-30",
  },
];

const initialForm: ExpenseFormState = {
  branchId: "muscat",
  branchName: "Muscat Branch",
  category: "other",
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function ExpensesPage() {
  const { profile } = useAuth();

  const [rows, setRows] = useState<ExpenseRow[]>(initialRows);
  const [form, setForm] = useState<ExpenseFormState>({
    ...initialForm,
    branchId:
      profile?.branchId || initialForm.branchId,
    branchName: profile?.branchId
      ? "Assigned Branch"
      : initialForm.branchName,
  });
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");

  useEffect(() => {
    if (
      profile?.role === "branch_manager" &&
      profile.branchId
    ) {
      setForm((current) => ({
        ...current,
        branchId: profile.branchId,
      }));
    }
  }, [profile?.branchId, profile?.role]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (profile?.role === "branch_manager" && profile.branchId && row.branchId !== profile.branchId) {
        return false;
      }

      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, profile?.branchId, profile?.role, rows]);

  const total = useMemo(() => {
    return visibleRows.reduce((sum, row) => sum + row.amount, 0);
  }, [visibleRows]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    if (profile?.role === "branch_manager" && profile.branchId && form.branchId !== profile.branchId) {
      return;
    }

    const newRow: ExpenseRow = {
      id: `EXP-${Date.now()}`,
      branchId: form.branchId,
      branchName: form.branchName,
      category: form.category,
      description: form.description.trim(),
      amount,
      date: form.date,
    };

    setRows((current) => [newRow, ...current]);
    setForm((current) => ({
      ...current,
      description: "",
      amount: "",
    }));
  }

  function removeExpense(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

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

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500">Branch Name</span>
              <input
                type="text"
                value={form.branchName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    branchName: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-600"
                required
                disabled={profile?.role === "branch_manager"}
              />
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
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Save size={16} />
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Ref</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                    <td className="px-5 py-4 font-semibold text-gray-900">{row.id}</td>
                    <td className="px-5 py-4 text-gray-700">{row.branchName}</td>
                    <td className="px-5 py-4 text-gray-700">{categoryLabel[row.category]}</td>
                    <td className="px-5 py-4 text-gray-700">{row.description}</td>
                    <td className="px-5 py-4 text-gray-700">{row.date}</td>
                    <td className="px-5 py-4 font-semibold text-gray-900">{row.amount.toFixed(3)} OMR</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removeExpense(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
