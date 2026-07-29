import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  Printer,
  Save,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router";

import { supabase } from "../../../utils/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface BranchOption {
  id: string;
  code: string;
  name: string;
  governorate: string | null;
  wilaya: string | null;
}

interface ShipmentFormState {
  senderType: "individual" | "merchant";

  senderName: string;
  senderPhone: string;

  recipientName: string;
  recipientPhone: string;

  recipientGovernorate: string;
  recipientWilaya: string;
  recipientAddress: string;
  recipientLocationUrl: string;

  originBranchId: string;
  destinationBranchId: string;

  serviceType:
    | "office_to_office"
    | "office_to_home";

  itemDescription: string;
  piecesCount: string;
  weightKg: string;

  productValue: string;

  collectionRequired: boolean;
  collectionAmount: string;

  shippingFee: string;

  shippingPaymentMethod:
    | "cash"
    | "card"
    | "bank_transfer"
    | "credit";

  shippingFeePaid: boolean;

  senderPaidAmount: string;
  recipientDueAmount: string;

  employeeNotes: string;
}

interface CreatedShipment {
  id: string;
  tracking_number: string;
  created_at: string;
  shipping_fee: number;
  collection_amount: number;
  recipient_due_amount: number;
}

const initialForm: ShipmentFormState = {
  senderType: "individual",

  senderName: "",
  senderPhone: "",

  recipientName: "",
  recipientPhone: "",

  recipientGovernorate: "",
  recipientWilaya: "",
  recipientAddress: "",
  recipientLocationUrl: "",

  originBranchId: "",
  destinationBranchId: "",

  serviceType: "office_to_office",

  itemDescription: "",
  piecesCount: "1",
  weightKg: "",

  productValue: "0",

  collectionRequired: false,
  collectionAmount: "0",

  shippingFee: "0.800",

  shippingPaymentMethod: "cash",
  shippingFeePaid: true,

  senderPaidAmount: "0.800",
  recipientDueAmount: "0",

  employeeNotes: "",
};

function optionalText(
  value: string,
): string | null {
  const trimmedValue = value.trim();

  return trimmedValue
    ? trimmedValue
    : null;
}

function parseMoney(
  value: string,
): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Number(
    numberValue.toFixed(3),
  );
}

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat("ar-OM", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export default function NewShipmentPage() {
  const navigate = useNavigate();

  const { profile } = useAuth();

  const [branches, setBranches] =
    useState<BranchOption[]>([]);

  const [form, setForm] =
    useState<ShipmentFormState>(
      initialForm,
    );

  const [
    loadingBranches,
    setLoadingBranches,
  ] = useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    createdShipment,
    setCreatedShipment,
  ] = useState<CreatedShipment | null>(
    null,
  );

  useEffect(() => {
    document.title =
      "تسجيل شحنة جديدة | ROCK Delivery";
  }, []);

  const loadBranches =
    useCallback(async () => {
      setLoadingBranches(true);
      setErrorMessage("");

      try {
        const {
          data,
          error,
        } = await supabase
          .from("branches")
          .select(
            `
              id,
              code,
              name,
              governorate,
              wilaya
            `,
          )
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        const loadedBranches =
          (data || []) as BranchOption[];

        setBranches(loadedBranches);

        setForm((currentForm) => {
          const defaultOriginBranch =
            currentForm.originBranchId ||
            profile?.branchId ||
            loadedBranches[0]?.id ||
            "";

          return {
            ...currentForm,
            originBranchId:
              defaultOriginBranch,
          };
        });
      } catch (error) {
        console.error(
          "Failed to load branches:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? `تعذر تحميل الفروع: ${error.message}`
            : "تعذر تحميل قائمة الفروع.",
        );
      } finally {
        setLoadingBranches(false);
      }
    }, [profile?.branchId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const selectedOriginBranch =
    useMemo(() => {
      return branches.find(
        (branch) =>
          branch.id ===
          form.originBranchId,
      );
    }, [
      branches,
      form.originBranchId,
    ]);

  const selectedDestinationBranch =
    useMemo(() => {
      return branches.find(
        (branch) =>
          branch.id ===
          form.destinationBranchId,
      );
    }, [
      branches,
      form.destinationBranchId,
    ]);

  const financialSummary =
    useMemo(() => {
      const shippingFee = parseMoney(
        form.shippingFee,
      );

      const collectionAmount =
        form.collectionRequired
          ? parseMoney(
              form.collectionAmount,
            )
          : 0;

      const senderPaid =
        parseMoney(
          form.senderPaidAmount,
        );

      const recipientDue =
        parseMoney(
          form.recipientDueAmount,
        );

      return {
        shippingFee,
        collectionAmount,
        senderPaid,
        recipientDue,
      };
    }, [
      form.shippingFee,
      form.collectionRequired,
      form.collectionAmount,
      form.senderPaidAmount,
      form.recipientDueAmount,
    ]);

  function updateField<
    Key extends keyof ShipmentFormState,
  >(
    field: Key,
    value: ShipmentFormState[Key],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleServiceTypeChange(
    serviceType:
      | "office_to_office"
      | "office_to_home",
  ) {
    const shippingFee =
      serviceType ===
      "office_to_home"
        ? "1.500"
        : "0.800";

    setForm((currentForm) => {
      const senderPaidAmount =
        currentForm.shippingFeePaid
          ? shippingFee
          : "0";

      const collectionAmount =
        currentForm.collectionRequired
          ? parseMoney(
              currentForm.collectionAmount,
            )
          : 0;

      const recipientDueAmount =
        currentForm.shippingFeePaid
          ? collectionAmount
          : parseMoney(shippingFee) +
            collectionAmount;

      return {
        ...currentForm,
        serviceType,
        shippingFee,
        senderPaidAmount,
        recipientDueAmount:
          recipientDueAmount.toFixed(3),
      };
    });
  }

  function handleCollectionChange(
    checked: boolean,
  ) {
    setForm((currentForm) => {
      const shippingFee = parseMoney(
        currentForm.shippingFee,
      );

      const collectionAmount = checked
        ? parseMoney(
            currentForm.collectionAmount,
          )
        : 0;

      const recipientDue =
        collectionAmount +
        (currentForm.shippingFeePaid
          ? 0
          : shippingFee);

      return {
        ...currentForm,
        collectionRequired: checked,
        collectionAmount: checked
          ? currentForm.collectionAmount
          : "0",
        recipientDueAmount:
          recipientDue.toFixed(3),
      };
    });
  }

  function handleShippingPaidChange(
    checked: boolean,
  ) {
    setForm((currentForm) => {
      const shippingFee = parseMoney(
        currentForm.shippingFee,
      );

      const collectionAmount =
        currentForm.collectionRequired
          ? parseMoney(
              currentForm.collectionAmount,
            )
          : 0;

      return {
        ...currentForm,
        shippingFeePaid: checked,
        senderPaidAmount: checked
          ? shippingFee.toFixed(3)
          : "0",
        recipientDueAmount: (
          collectionAmount +
          (checked ? 0 : shippingFee)
        ).toFixed(3),
      };
    });
  }

  function validateForm():
    | string
    | null {
    if (!profile?.id) {
      return "تعذر تحديد المستخدم المسجل.";
    }

    if (!form.originBranchId) {
      return "اختر فرع الإرسال.";
    }

    if (!form.destinationBranchId) {
      return "اختر فرع الوجهة.";
    }

    if (
      form.originBranchId ===
        form.destinationBranchId &&
      form.serviceType ===
        "office_to_office"
    ) {
      return "يجب أن يختلف فرع الإرسال عن فرع الوجهة في خدمة مكتب إلى مكتب.";
    }

    if (!form.senderName.trim()) {
      return "أدخل اسم المرسل.";
    }

    if (!form.senderPhone.trim()) {
      return "أدخل رقم هاتف المرسل.";
    }

    if (!form.recipientName.trim()) {
      return "أدخل اسم المستلم.";
    }

    if (!form.recipientPhone.trim()) {
      return "أدخل رقم هاتف المستلم.";
    }

    if (!form.itemDescription.trim()) {
      return "أدخل وصف الغرض أو المنتج.";
    }

    const piecesCount = Number(
      form.piecesCount,
    );

    if (
      !Number.isInteger(piecesCount) ||
      piecesCount <= 0
    ) {
      return "عدد القطع يجب أن يكون رقمًا صحيحًا أكبر من صفر.";
    }

    if (
      form.collectionRequired &&
      parseMoney(
        form.collectionAmount,
      ) <= 0
    ) {
      return "أدخل مبلغ التحصيل المطلوب من المستلم.";
    }

    if (
      form.serviceType ===
        "office_to_home" &&
      !form.recipientAddress.trim()
    ) {
      return "أدخل عنوان المستلم لخدمة التوصيل إلى المنزل.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setSaving(true);
    setErrorMessage("");
    setCreatedShipment(null);

    try {
      const piecesCount = Number(
        form.piecesCount,
      );

      const weightKg =
        form.weightKg.trim()
          ? Number(form.weightKg)
          : null;

      const payload = {
        origin_branch_id:
          form.originBranchId,

        destination_branch_id:
          form.destinationBranchId,

        current_branch_id:
          form.originBranchId,

        current_status_code:
          "created",

        service_type:
          form.serviceType,

        sender_type:
          form.senderType,

        sender_name:
          form.senderName.trim(),

        sender_phone:
          form.senderPhone.trim(),

        recipient_name:
          form.recipientName.trim(),

        recipient_phone:
          form.recipientPhone.trim(),

        recipient_governorate:
          optionalText(
            form.recipientGovernorate,
          ),

        recipient_wilaya:
          optionalText(
            form.recipientWilaya,
          ),

        recipient_address:
          optionalText(
            form.recipientAddress,
          ),

        recipient_location_url:
          optionalText(
            form.recipientLocationUrl,
          ),

        item_description:
          form.itemDescription.trim(),

        pieces_count:
          piecesCount,

        weight_kg:
          weightKg,

        product_value:
          parseMoney(
            form.productValue,
          ),

        collection_required:
          form.collectionRequired,

        collection_amount:
          form.collectionRequired
            ? parseMoney(
                form.collectionAmount,
              )
            : 0,

        shipping_fee:
          parseMoney(
            form.shippingFee,
          ),

        shipping_payment_method:
          form.shippingPaymentMethod,

        shipping_fee_paid:
          form.shippingFeePaid,

        sender_paid_amount:
          parseMoney(
            form.senderPaidAmount,
          ),

        recipient_due_amount:
          parseMoney(
            form.recipientDueAmount,
          ),

        employee_notes:
          optionalText(
            form.employeeNotes,
          ),

        created_by:
          profile!.id,
      };

      const {
        data,
        error,
      } = await supabase
        .from("shipments")
        .insert(payload)
        .select(
          `
            id,
            tracking_number,
            created_at,
            shipping_fee,
            collection_amount,
            recipient_due_amount
          `,
        )
        .single();

      if (error) {
        throw error;
      }

      setCreatedShipment(
        data as CreatedShipment,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Failed to create shipment:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? `تعذر تسجيل الشحنة: ${error.message}`
          : "تعذر تسجيل الشحنة. حاول مرة أخرى.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setCreatedShipment(null);

    setForm({
      ...initialForm,

      originBranchId:
        profile?.branchId ||
        branches[0]?.id ||
        "",

      destinationBranchId: "",
    });

    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function printReceipt() {
    window.print();
  }

  if (loadingBranches) {
    return (
      <div className="new-shipment-loading">
        <LoaderCircle
          className="button-spinner"
          size={25}
        />

        <span>
          جاري تحميل نموذج الشحنة...
        </span>
      </div>
    );
  }

  if (createdShipment) {
    return (
      <section
        className="shipment-success-page"
        dir="rtl"
      >
        <div className="shipment-success-card">
          <div className="shipment-success-icon">
            <CheckCircle2 size={45} />
          </div>

          <span>
            تم تسجيل الشحنة بنجاح
          </span>

          <h1 dir="ltr">
            {
              createdShipment.tracking_number
            }
          </h1>

          <p>
            احتفظ برقم التتبع أو اطبع
            الإيصال وسلمه إلى العميل.
          </p>

          <div className="shipment-receipt">
            <div>
              <span>المرسل</span>

              <strong>
                {form.senderName}
              </strong>
            </div>

            <div>
              <span>المستلم</span>

              <strong>
                {form.recipientName}
              </strong>
            </div>

            <div>
              <span>فرع الإرسال</span>

              <strong>
                {selectedOriginBranch?.name ||
                  "غير محدد"}
              </strong>
            </div>

            <div>
              <span>فرع الوجهة</span>

              <strong>
                {selectedDestinationBranch?.name ||
                  "غير محدد"}
              </strong>
            </div>

            <div>
              <span>نوع الخدمة</span>

              <strong>
                {form.serviceType ===
                "office_to_home"
                  ? "مكتب إلى منزل"
                  : "مكتب إلى مكتب"}
              </strong>
            </div>

            <div>
              <span>رسوم الشحن</span>

              <strong>
                {formatMoney(
                  createdShipment.shipping_fee,
                )}{" "}
                ر.ع
              </strong>
            </div>

            <div>
              <span>مبلغ التحصيل</span>

              <strong>
                {formatMoney(
                  createdShipment.collection_amount,
                )}{" "}
                ر.ع
              </strong>
            </div>

            <div>
              <span>
                المطلوب من المستلم
              </span>

              <strong>
                {formatMoney(
                  createdShipment.recipient_due_amount,
                )}{" "}
                ر.ع
              </strong>
            </div>
          </div>

          <div className="shipment-success-actions">
            <button
              type="button"
              className="shipment-secondary-button"
              onClick={resetForm}
            >
              <Package size={19} />

              تسجيل شحنة أخرى
            </button>

            <button
              type="button"
              className="shipment-primary-button"
              onClick={printReceipt}
            >
              <Printer size={19} />

              طباعة الإيصال
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="new-shipment-page"
      dir="rtl"
    >
      <div className="new-shipment-heading">
        <div>
          <h1>
            تسجيل شحنة جديدة
          </h1>

          <p>
            أدخل بيانات المرسل والمستلم
            والمسار والمبالغ المطلوبة.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/staff/office")
          }
        >
          <ArrowRight size={18} />

          العودة
        </button>
      </div>

      {errorMessage && (
        <div className="shipment-alert shipment-alert-error">
          <AlertCircle size={20} />

          <span>
            {errorMessage}
          </span>
        </div>
      )}

      <form
        className="new-shipment-form"
        onSubmit={handleSubmit}
      >
        <div className="shipment-parties-grid">
          <section className="shipment-form-section">
            <div className="shipment-section-heading">
              <div>
                <UserRound size={22} />
              </div>

              <span>
                <strong>
                  بيانات المرسل
                </strong>

                <small>
                  معلومات الشخص أو التاجر
                  الذي أرسل الشحنة
                </small>
              </span>
            </div>

            <div className="shipment-form-grid">
              <label>
                <span>
                  نوع المرسل
                </span>

                <select
                  value={form.senderType}
                  onChange={(event) =>
                    updateField(
                      "senderType",
                      event.target
                        .value as
                        | "individual"
                        | "merchant",
                    )
                  }
                >
                  <option value="individual">
                    فرد
                  </option>

                  <option value="merchant">
                    تاجر
                  </option>
                </select>
              </label>

              <label>
                <span>
                  اسم المرسل *
                </span>

                <input
                  type="text"
                  value={form.senderName}
                  onChange={(event) =>
                    updateField(
                      "senderName",
                      event.target.value,
                    )
                  }
                  placeholder="الاسم الكامل"
                  required
                />
              </label>

              <label>
                <span>
                  رقم هاتف المرسل *
                </span>

                <div className="shipment-input-icon">
                  <Phone size={18} />

                  <input
                    type="tel"
                    value={form.senderPhone}
                    onChange={(event) =>
                      updateField(
                        "senderPhone",
                        event.target.value,
                      )
                    }
                    placeholder="9XXXXXXX"
                    required
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="shipment-form-section">
            <div className="shipment-section-heading">
              <div>
                <UserRound size={22} />
              </div>

              <span>
                <strong>
                  بيانات المستلم
                </strong>

                <small>
                  معلومات الشخص الذي سيستلم
                  الشحنة
                </small>
              </span>
            </div>

            <div className="shipment-form-grid">
              <label>
                <span>
                  اسم المستلم *
                </span>

                <input
                  type="text"
                  value={
                    form.recipientName
                  }
                  onChange={(event) =>
                    updateField(
                      "recipientName",
                      event.target.value,
                    )
                  }
                  placeholder="الاسم الكامل"
                  required
                />
              </label>

              <label>
                <span>
                  رقم هاتف المستلم *
                </span>

                <div className="shipment-input-icon">
                  <Phone size={18} />

                  <input
                    type="tel"
                    value={
                      form.recipientPhone
                    }
                    onChange={(event) =>
                      updateField(
                        "recipientPhone",
                        event.target.value,
                      )
                    }
                    placeholder="9XXXXXXX"
                    required
                  />
                </div>
              </label>
            </div>
          </section>
        </div>

        <section className="shipment-form-section">
          <div className="shipment-section-heading">
            <div>
              <Building2 size={22} />
            </div>

            <span>
              <strong>
                مسار الشحنة
              </strong>

              <small>
                فرع الإرسال وفرع الوجهة
                ونوع الخدمة
              </small>
            </span>
          </div>

          <div className="shipment-form-grid">
            <label>
              <span>
                فرع الإرسال *
              </span>

              <select
                value={
                  form.originBranchId
                }
                onChange={(event) =>
                  updateField(
                    "originBranchId",
                    event.target.value,
                  )
                }
                required
              >
                <option value="">
                  اختر فرع الإرسال
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name} —{" "}
                      {branch.code}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                فرع الوجهة *
              </span>

              <select
                value={
                  form.destinationBranchId
                }
                onChange={(event) =>
                  updateField(
                    "destinationBranchId",
                    event.target.value,
                  )
                }
                required
              >
                <option value="">
                  اختر فرع الوجهة
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name} —{" "}
                      {branch.code}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                نوع خدمة التوصيل *
              </span>

              <select
                value={form.serviceType}
                onChange={(event) =>
                  handleServiceTypeChange(
                    event.target
                      .value as
                      | "office_to_office"
                      | "office_to_home",
                  )
                }
              >
                <option value="office_to_office">
                  مكتب إلى مكتب
                </option>

                <option value="office_to_home">
                  مكتب إلى منزل
                </option>
              </select>
            </label>

            <label>
              <span>
                المحافظة
              </span>

              <input
                type="text"
                value={
                  form.recipientGovernorate
                }
                onChange={(event) =>
                  updateField(
                    "recipientGovernorate",
                    event.target.value,
                  )
                }
                placeholder="مثال: البريمي"
              />
            </label>

            <label>
              <span>
                الولاية أو المنطقة
              </span>

              <input
                type="text"
                value={
                  form.recipientWilaya
                }
                onChange={(event) =>
                  updateField(
                    "recipientWilaya",
                    event.target.value,
                  )
                }
                placeholder="اسم الولاية أو المنطقة"
              />
            </label>

            <label className="shipment-full-field">
              <span>
                عنوان المستلم
              </span>

              <textarea
                value={
                  form.recipientAddress
                }
                onChange={(event) =>
                  updateField(
                    "recipientAddress",
                    event.target.value,
                  )
                }
                placeholder="العنوان التفصيلي للتوصيل"
                rows={3}
              />
            </label>

            <label className="shipment-full-field">
              <span>
                رابط الموقع
              </span>

              <input
                type="url"
                value={
                  form.recipientLocationUrl
                }
                onChange={(event) =>
                  updateField(
                    "recipientLocationUrl",
                    event.target.value,
                  )
                }
                placeholder="رابط موقع Google Maps"
              />
            </label>
          </div>
        </section>

        <section className="shipment-form-section">
          <div className="shipment-section-heading">
            <div>
              <Package size={22} />
            </div>

            <span>
              <strong>
                بيانات الشحنة
              </strong>

              <small>
                وصف المنتج وعدد القطع
                والوزن والقيمة
              </small>
            </span>
          </div>

          <div className="shipment-form-grid">
            <label className="shipment-full-field">
              <span>
                وصف الغرض أو المنتج *
              </span>

              <textarea
                value={
                  form.itemDescription
                }
                onChange={(event) =>
                  updateField(
                    "itemDescription",
                    event.target.value,
                  )
                }
                placeholder="مثال: ملابس، إلكترونيات، مستندات..."
                rows={3}
                required
              />
            </label>

            <label>
              <span>
                عدد القطع *
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={form.piecesCount}
                onChange={(event) =>
                  updateField(
                    "piecesCount",
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>
                الوزن بالكيلوجرام
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={form.weightKg}
                onChange={(event) =>
                  updateField(
                    "weightKg",
                    event.target.value,
                  )
                }
                placeholder="اختياري"
              />
            </label>

            <label>
              <span>
                قيمة المنتج
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  form.productValue
                }
                onChange={(event) =>
                  updateField(
                    "productValue",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="shipment-form-section">
          <div className="shipment-section-heading">
            <div>
              <CircleDollarSign
                size={22}
              />
            </div>

            <span>
              <strong>
                البيانات المالية
              </strong>

              <small>
                رسوم الشحن ومبالغ التحصيل
                والدفع
              </small>
            </span>
          </div>

          <div className="shipment-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={
                  form.collectionRequired
                }
                onChange={(event) =>
                  handleCollectionChange(
                    event.target.checked,
                  )
                }
              />

              <span>
                يجب تحصيل قيمة المنتج
                من المستلم
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  form.shippingFeePaid
                }
                onChange={(event) =>
                  handleShippingPaidChange(
                    event.target.checked,
                  )
                }
              />

              <span>
                دفع المرسل رسوم الشحن
              </span>
            </label>
          </div>

          <div className="shipment-form-grid">
            <label>
              <span>
                رسوم الشحن
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={form.shippingFee}
                onChange={(event) =>
                  updateField(
                    "shippingFee",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                مبلغ التحصيل
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  form.collectionAmount
                }
                disabled={
                  !form.collectionRequired
                }
                onChange={(event) =>
                  updateField(
                    "collectionAmount",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                طريقة دفع رسوم الشحن
              </span>

              <select
                value={
                  form.shippingPaymentMethod
                }
                onChange={(event) =>
                  updateField(
                    "shippingPaymentMethod",
                    event.target
                      .value as
                      | "cash"
                      | "card"
                      | "bank_transfer"
                      | "credit",
                  )
                }
              >
                <option value="cash">
                  نقدًا
                </option>

                <option value="card">
                  بطاقة
                </option>

                <option value="bank_transfer">
                  تحويل بنكي
                </option>

                <option value="credit">
                  آجل
                </option>
              </select>
            </label>

            <label>
              <span>
                المبلغ المدفوع من المرسل
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  form.senderPaidAmount
                }
                onChange={(event) =>
                  updateField(
                    "senderPaidAmount",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                المطلوب من المستلم
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  form.recipientDueAmount
                }
                onChange={(event) =>
                  updateField(
                    "recipientDueAmount",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className="shipment-financial-summary">
            <div>
              <span>
                رسوم الشحن
              </span>

              <strong>
                {formatMoney(
                  financialSummary.shippingFee,
                )}{" "}
                ر.ع
              </strong>
            </div>

            <div>
              <span>
                مبلغ التحصيل
              </span>

              <strong>
                {formatMoney(
                  financialSummary.collectionAmount,
                )}{" "}
                ر.ع
              </strong>
            </div>

            <div>
              <span>
                دفع المرسل
              </span>

              <strong>
                {formatMoney(
                  financialSummary.senderPaid,
                )}{" "}
                ر.ع
              </strong>
            </div>

            <div>
              <span>
                المطلوب من المستلم
              </span>

              <strong>
                {formatMoney(
                  financialSummary.recipientDue,
                )}{" "}
                ر.ع
              </strong>
            </div>
          </div>
        </section>

        <section className="shipment-form-section">
          <div className="shipment-section-heading">
            <div>
              <FileText size={22} />
            </div>

            <span>
              <strong>
                ملاحظات الموظف
              </strong>

              <small>
                ملاحظات داخلية لا تظهر
                للعميل
              </small>
            </span>
          </div>

          <label className="shipment-full-field">
            <textarea
              value={
                form.employeeNotes
              }
              onChange={(event) =>
                updateField(
                  "employeeNotes",
                  event.target.value,
                )
              }
              placeholder="أي ملاحظات خاصة بالشحنة..."
              rows={4}
            />
          </label>
        </section>

        <div className="shipment-submit-area">
          <div>
            <span>
              سيتم إنشاء رقم التتبع
              تلقائيًا بعد الحفظ.
            </span>

            <small>
              تأكد من بيانات المرسل
              والمستلم قبل تسجيل الشحنة.
            </small>
          </div>

          <button
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoaderCircle
                  className="button-spinner"
                  size={20}
                />

                جاري تسجيل الشحنة...
              </>
            ) : (
              <>
                <Save size={20} />

                حفظ وإنشاء رقم التتبع
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
