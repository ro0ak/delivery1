import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

interface BranchRow {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  governorate: string | null;
  wilaya: string | null;
  address: string | null;
  manager_id: string | null;
  opening_balance: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ManagerOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface BranchFormState {
  code: string;
  name: string;
  phone: string;
  email: string;
  governorate: string;
  wilaya: string;
  address: string;
  managerId: string;
  openingBalance: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: BranchFormState = {
  code: "",
  name: "",
  phone: "",
  email: "",
  governorate: "",
  wilaya: "",
  address: "",
  managerId: "",
  openingBalance: "0",
  notes: "",
  isActive: true,
};

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function getManagerName(
  managerId: string | null,
  managers: ManagerOption[],
): string {
  if (!managerId) {
    return "غير معيّن";
  }

  return (
    managers.find((manager) => manager.id === managerId)
      ?.full_name || "غير معيّن"
  );
}

export default function BranchesPage() {
  const { profile } = useAuth();

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] =
    useState<BranchRow | null>(null);
  const [form, setForm] = useState<BranchFormState>(emptyForm);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    document.title = "إدارة الفروع | ROCK Delivery";
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setErrorMessage("");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setSuccessMessage("");
  }, []);

  const loadBranches = useCallback(async () => {
    const { data, error } = await supabase
      .from("branches")
      .select(
        `
          id,
          code,
          name,
          phone,
          email,
          governorate,
          wilaya,
          address,
          manager_id,
          opening_balance,
          is_active,
          notes,
          created_at,
          updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    setBranches((data || []) as BranchRow[]);
  }, []);

  const loadManagers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          role
        `,
      )
      .in("role", ["super_admin", "branch_manager"])
      .eq("is_active", true)
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    setManagers((data || []) as ManagerOption[]);
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      await Promise.all([loadBranches(), loadManagers()]);
    } catch (error) {
      console.error("Failed to load branches page:", error);

      showError(
        error instanceof Error
          ? `تعذر تحميل بيانات الفروع: ${error.message}`
          : "تعذر تحميل بيانات الفروع.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadBranches, loadManagers, showError]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const filteredBranches = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && branch.is_active) ||
        (statusFilter === "inactive" && !branch.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const values = [
        branch.code,
        branch.name,
        branch.phone,
        branch.email,
        branch.governorate,
        branch.wilaya,
        branch.address,
      ];

      return values.some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [branches, searchQuery, statusFilter]);

  const statistics = useMemo(() => {
    return {
      total: branches.length,
      active: branches.filter((branch) => branch.is_active).length,
      inactive: branches.filter((branch) => !branch.is_active).length,
    };
  }, [branches]);

  function openCreateForm() {
    setEditingBranch(null);
    setForm(emptyForm);
    setErrorMessage("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(branch: BranchRow) {
    setEditingBranch(branch);

    setForm({
      code: branch.code,
      name: branch.name,
      phone: branch.phone || "",
      email: branch.email || "",
      governorate: branch.governorate || "",
      wilaya: branch.wilaya || "",
      address: branch.address || "",
      managerId: branch.manager_id || "",
      openingBalance: String(branch.opening_balance ?? 0),
      notes: branch.notes || "",
      isActive: branch.is_active,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    setEditingBranch(null);
    setForm(emptyForm);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const openingBalance = Number(form.openingBalance || 0);

    if (!code || !name) {
      showError("أدخل رمز الفرع واسم الفرع.");
      return;
    }

    if (
      !Number.isFinite(openingBalance) ||
      openingBalance < 0
    ) {
      showError("الرصيد الافتتاحي يجب أن يكون رقمًا صحيحًا.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        code,
        name,
        phone: normalizeOptionalText(form.phone),
        email: normalizeOptionalText(form.email),
        governorate: normalizeOptionalText(form.governorate),
        wilaya: normalizeOptionalText(form.wilaya),
        address: normalizeOptionalText(form.address),
        manager_id: form.managerId || null,
        opening_balance: openingBalance,
        notes: normalizeOptionalText(form.notes),
        is_active: form.isActive,
      };

      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update(payload)
          .eq("id", editingBranch.id);

        if (error) {
          throw error;
        }

        showSuccess("تم تحديث بيانات الفرع بنجاح.");
      } else {
        const { error } = await supabase.from("branches").insert({
          ...payload,
          created_by: profile?.id || null,
        });

        if (error) {
          throw error;
        }

        showSuccess("تمت إضافة الفرع بنجاح.");
      }

      closeForm();
      await loadBranches();
    } catch (error) {
      console.error("Failed to save branch:", error);

      const message =
        error instanceof Error ? error.message : "";

      if (
        message.toLowerCase().includes("duplicate") ||
        message.toLowerCase().includes("unique")
      ) {
        showError("رمز الفرع مستخدم مسبقًا. اختر رمزًا آخر.");
      } else {
        showError(
          message
            ? `تعذر حفظ الفرع: ${message}`
            : "تعذر حفظ بيانات الفرع.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleBranchStatus(branch: BranchRow) {
    if (togglingId) {
      return;
    }

    setTogglingId(branch.id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("branches")
        .update({
          is_active: !branch.is_active,
        })
        .eq("id", branch.id);

      if (error) {
        throw error;
      }

      showSuccess(
        branch.is_active
          ? "تم إيقاف الفرع."
          : "تم تفعيل الفرع.",
      );

      await loadBranches();
    } catch (error) {
      console.error("Failed to toggle branch:", error);

      showError(
        error instanceof Error
          ? `تعذر تغيير حالة الفرع: ${error.message}`
          : "تعذر تغيير حالة الفرع.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteBranch(branch: BranchRow) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف فرع "${branch.name}"؟\n\nيفضل إيقاف الفرع بدل حذفه إذا كانت له بيانات مرتبطة.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(branch.id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branch.id);

      if (error) {
        throw error;
      }

      showSuccess("تم حذف الفرع بنجاح.");
      await loadBranches();
    } catch (error) {
      console.error("Failed to delete branch:", error);

      showError(
        error instanceof Error
          ? `تعذر حذف الفرع: ${error.message}`
          : "تعذر حذف الفرع. قد توجد بيانات مرتبطة به.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <LoaderCircle className="animate-spin" size={22} />
          جاري تحميل الفروع...
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-red-600">
            إدارة النظام
          </p>

          <h1 className="text-2xl font-bold text-gray-950">
            إدارة الفروع
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            إضافة الفروع وتعديل بياناتها وتعيين المدير المسؤول.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPageData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            تحديث
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Plus size={19} />
            إضافة فرع
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <Building2 size={21} />
          </div>

          <span className="text-sm text-gray-500">إجمالي الفروع</span>
          <strong className="mt-1 block text-3xl text-gray-950">
            {statistics.total}
          </strong>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <CheckCircle2 size={21} />
          </div>

          <span className="text-sm text-gray-500">الفروع النشطة</span>
          <strong className="mt-1 block text-3xl text-gray-950">
            {statistics.active}
          </strong>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <Power size={21} />
          </div>

          <span className="text-sm text-gray-500">الفروع المتوقفة</span>
          <strong className="mt-1 block text-3xl text-gray-950">
            {statistics.inactive}
          </strong>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={19}
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="ابحث بالاسم أو الرمز أو الولاية..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-12 pl-4 text-sm outline-none transition focus:border-red-600 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "all"
                  | "active"
                  | "inactive",
              )
            }
            className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-600"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">متوقف</option>
          </select>
        </div>

        {filteredBranches.length === 0 ? (
          <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <Building2 size={30} />
            </div>

            <h2 className="text-lg font-bold text-gray-900">
              لا توجد فروع
            </h2>

            <p className="mt-2 max-w-md text-sm text-gray-500">
              لم يتم العثور على فروع مطابقة للبحث أو الفلتر الحالي.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-5 py-4">الفرع</th>
                  <th className="px-5 py-4">الموقع</th>
                  <th className="px-5 py-4">التواصل</th>
                  <th className="px-5 py-4">مدير الفرع</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="border-b border-gray-100 text-sm last:border-b-0 hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                          <Building2 size={21} />
                        </div>

                        <div>
                          <strong className="block text-gray-950">
                            {branch.name}
                          </strong>

                          <span className="mt-1 block text-xs text-gray-500">
                            {branch.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 shrink-0 text-gray-400"
                          size={17}
                        />

                        <div>
                          <span className="block text-gray-800">
                            {[branch.governorate, branch.wilaya]
                              .filter(Boolean)
                              .join(" - ") || "غير محدد"}
                          </span>

                          {branch.address && (
                            <span className="mt-1 block max-w-[260px] text-xs text-gray-500">
                              {branch.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      {branch.phone ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone size={16} />
                          <span dir="ltr">{branch.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          غير محدد
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-5 text-gray-700">
                      {getManagerName(
                        branch.manager_id,
                        managers,
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                          branch.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {branch.is_active ? "نشط" : "متوقف"}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="تعديل"
                          onClick={() => openEditForm(branch)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          type="button"
                          title={
                            branch.is_active
                              ? "إيقاف الفرع"
                              : "تفعيل الفرع"
                          }
                          disabled={togglingId === branch.id}
                          onClick={() =>
                            void toggleBranchStatus(branch)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                        >
                          {togglingId === branch.id ? (
                            <LoaderCircle
                              className="animate-spin"
                              size={17}
                            />
                          ) : (
                            <Power size={17} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="حذف الفرع"
                          disabled={deletingId === branch.id}
                          onClick={() => void deleteBranch(branch)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === branch.id ? (
                            <LoaderCircle
                              className="animate-spin"
                              size={17}
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-950">
                  {editingBranch
                    ? "تعديل بيانات الفرع"
                    : "إضافة فرع جديد"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  أدخل معلومات الفرع ثم اضغط حفظ.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    رمز الفرع *
                  </span>

                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="مثال: MUSCAT"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    اسم الفرع *
                  </span>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="مثال: فرع مسقط"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    المحافظة
                  </span>

                  <input
                    type="text"
                    value={form.governorate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        governorate: event.target.value,
                      }))
                    }
                    placeholder="مسقط"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    الولاية
                  </span>

                  <input
                    type="text"
                    value={form.wilaya}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        wilaya: event.target.value,
                      }))
                    }
                    placeholder="السيب"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    رقم الهاتف
                  </span>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="9XXXXXXX"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-right outline-none focus:border-red-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    البريد الإلكتروني
                  </span>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="branch@company.com"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    مدير الفرع
                  </span>

                  <select
                    value={form.managerId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        managerId: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-red-600"
                  >
                    <option value="">بدون مدير</option>

                    {managers.map((manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.full_name} — {manager.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">
                    الرصيد الافتتاحي
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.openingBalance}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        openingBalance: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-red-600"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">
                  العنوان
                </span>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="العنوان التفصيلي للفرع"
                  className="w-full resize-none rounded-xl border border-gray-200 p-4 outline-none focus:border-red-600"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">
                  ملاحظات
                </span>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="أي ملاحظات إضافية"
                  className="w-full resize-none rounded-xl border border-gray-200 p-4 outline-none focus:border-red-600"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 p-4">
                <div>
                  <strong className="block text-sm text-gray-900">
                    حالة الفرع
                  </strong>

                  <span className="mt-1 block text-xs text-gray-500">
                    الفروع المتوقفة لا تظهر في العمليات الجديدة.
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-red-700"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="h-12 flex-1 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        className="animate-spin"
                        size={19}
                      />
                      جاري الحفظ...
                    </>
                  ) : editingBranch ? (
                    "حفظ التعديلات"
                  ) : (
                    "إضافة الفرع"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
