import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Package,
  PackageCheck,
  PackageSearch,
  Phone,
  Search,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router";

import {
  supabase,
} from "../../../utils/supabase";

import {
  useAuth,
} from "../../contexts/AuthContext";

export type ShipmentOperationMode =
  | "search"
  | "receive"
  | "deliver";

interface ShipmentOperationsPageProps {
  mode: ShipmentOperationMode;
}

interface ShipmentRecord {
  id: string;
  tracking_number: string;

  origin_branch_id: string;
  destination_branch_id: string;
  current_branch_id: string | null;

  current_status_code: string;
  service_type: string;

  sender_name: string;
  sender_phone: string;

  recipient_name: string;
  recipient_phone: string;

  recipient_governorate:
    | string
    | null;

  recipient_wilaya:
    | string
    | null;

  recipient_address:
    | string
    | null;

  item_description: string;
  pieces_count: number;

  product_value: number;
  collection_required: boolean;
  collection_amount: number;
  shipping_fee: number;
  sender_paid_amount: number;
  recipient_due_amount: number;

  employee_notes: string | null;

  created_at: string;
  updated_at: string;
}

interface BranchRecord {
  id: string;
  code: string;
  name: string;
}

interface StatusRecord {
  code: string;
  name_ar: string;
  is_final: boolean;
}

const modeInformation: Record<
  ShipmentOperationMode,
  {
    title: string;
    description: string;
    buttonLabel: string;
  }
> = {
  search: {
    title: "البحث عن شحنة",
    description:
      "أدخل رقم التتبع لعرض بيانات الشحنة وحالتها الحالية.",
    buttonLabel: "عرض الشحنة",
  },

  receive: {
    title: "استلام شحنة في الفرع",
    description:
      "ابحث برقم التتبع ثم أكد استلام الشحنة داخل الفرع.",
    buttonLabel: "البحث للاستلام",
  },

  deliver: {
    title: "تسليم الشحنة للعميل",
    description:
      "ابحث برقم التتبع ثم أكد تسليم الشحنة إلى المستلم.",
    buttonLabel: "البحث للتسليم",
  },
};

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    "ar-OM",
    {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    },
  ).format(value || 0);
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-OM",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export default function ShipmentOperationsPage({
  mode,
}: ShipmentOperationsPageProps) {
  const navigate = useNavigate();

  const {
    profile,
  } = useAuth();

  const information =
    modeInformation[mode];

  const [
    trackingNumber,
    setTrackingNumber,
  ] = useState("");

  const [
    shipment,
    setShipment,
  ] = useState<ShipmentRecord | null>(
    null,
  );

  const [
    branches,
    setBranches,
  ] = useState<BranchRecord[]>([]);

  const [
    statuses,
    setStatuses,
  ] = useState<StatusRecord[]>([]);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    updating,
    setUpdating,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    publicNote,
    setPublicNote,
  ] = useState("");

  const [
    internalNote,
    setInternalNote,
  ] = useState("");

  useEffect(() => {
    document.title =
      `${information.title} | ROCK Delivery`;
  }, [
    information.title,
  ]);

  useEffect(() => {
    async function loadReferences() {
      try {
        const [
          branchesResponse,
          statusesResponse,
        ] = await Promise.all([
          supabase
            .from("branches")
            .select(
              "id, code, name",
            )
            .order(
              "name",
              {
                ascending: true,
              },
            ),

          supabase
            .from(
              "shipment_statuses",
            )
            .select(
              "code, name_ar, is_final",
            )
            .eq(
              "is_active",
              true,
            )
            .order(
              "display_order",
              {
                ascending: true,
              },
            ),
        ]);

        if (
          branchesResponse.error
        ) {
          throw branchesResponse.error;
        }

        if (
          statusesResponse.error
        ) {
          throw statusesResponse.error;
        }

        setBranches(
          (branchesResponse.data ||
            []) as BranchRecord[],
        );

        setStatuses(
          (statusesResponse.data ||
            []) as StatusRecord[],
        );
      } catch (error) {
        console.error(
          "Failed to load references:",
          error,
        );
      }
    }

    void loadReferences();
  }, []);

  function getBranchName(
    branchId: string | null,
  ): string {
    if (!branchId) {
      return "غير محدد";
    }

    const branch =
      branches.find(
        (item) =>
          item.id === branchId,
      );

    return branch
      ? `${branch.name} — ${branch.code}`
      : "غير محدد";
  }

  function getStatusName(
    statusCode: string,
  ): string {
    return (
      statuses.find(
        (status) =>
          status.code ===
          statusCode,
      )?.name_ar ||
      statusCode
    );
  }

  function isFinalStatus(
    statusCode: string,
  ): boolean {
    return (
      statuses.find(
        (status) =>
          status.code ===
          statusCode,
      )?.is_final || false
    );
  }

  async function searchShipment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedNumber =
      trackingNumber
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

    if (
      normalizedNumber.length < 5
    ) {
      setErrorMessage(
        "أدخل رقم تتبع صحيحًا.",
      );

      return;
    }

    setSearching(true);
    setShipment(null);
    setErrorMessage("");
    setSuccessMessage("");
    setPublicNote("");
    setInternalNote("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("shipments")
        .select(
          `
            id,
            tracking_number,
            origin_branch_id,
            destination_branch_id,
            current_branch_id,
            current_status_code,
            service_type,
            sender_name,
            sender_phone,
            recipient_name,
            recipient_phone,
            recipient_governorate,
            recipient_wilaya,
            recipient_address,
            item_description,
            pieces_count,
            product_value,
            collection_required,
            collection_amount,
            shipping_fee,
            sender_paid_amount,
            recipient_due_amount,
            employee_notes,
            created_at,
            updated_at
          `,
        )
        .eq(
          "tracking_number",
          normalizedNumber,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setErrorMessage(
          "لم يتم العثور على شحنة بهذا الرقم، أو أن حسابك لا يملك صلاحية مشاهدتها.",
        );

        return;
      }

      setTrackingNumber(
        normalizedNumber,
      );

      setShipment(
        data as ShipmentRecord,
      );
    } catch (error) {
      console.error(
        "Shipment search failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? `تعذر البحث عن الشحنة: ${error.message}`
          : "تعذر البحث عن الشحنة.",
      );
    } finally {
      setSearching(false);
    }
  }

  function validateOperation():
    | string
    | null {
    if (!shipment) {
      return "ابحث عن الشحنة أولًا.";
    }

    if (!profile?.id) {
      return "تعذر تحديد المستخدم الحالي.";
    }

    if (
      isFinalStatus(
        shipment.current_status_code,
      )
    ) {
      return "هذه الشحنة في حالة نهائية ولا يمكن تنفيذ العملية عليها.";
    }

    if (
      mode === "deliver" &&
      shipment.current_status_code ===
        "delivered"
    ) {
      return "تم تسليم هذه الشحنة مسبقًا.";
    }

    return null;
  }

  async function performOperation() {
    const validationError =
      validateOperation();

    if (validationError) {
      setErrorMessage(
        validationError,
      );

      return;
    }

    if (!shipment) {
      return;
    }

    const confirmationMessage =
      mode === "receive"
        ? `هل تريد تأكيد استلام الشحنة ${shipment.tracking_number} في الفرع؟`
        : `هل تريد تأكيد تسليم الشحنة ${shipment.tracking_number} إلى المستلم؟`;

    const confirmed =
      window.confirm(
        confirmationMessage,
      );

    if (!confirmed) {
      return;
    }

    setUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const newStatus =
        mode === "receive"
          ? "received_destination"
          : "delivered";

      const updatePayload: {
        current_status_code:
          string;
        current_branch_id?:
          string | null;
        delivered_at?:
          string;
        updated_by:
          string;
      } = {
        current_status_code:
          newStatus,

        updated_by:
          profile!.id,
      };

      if (mode === "receive") {
        updatePayload.current_branch_id =
          profile?.branchId ||
          shipment.destination_branch_id;
      }

      if (mode === "deliver") {
        updatePayload.delivered_at =
          new Date().toISOString();
      }

      const {
        data,
        error,
      } = await supabase
        .from("shipments")
        .update(updatePayload)
        .eq(
          "id",
          shipment.id,
        )
        .select(
          `
            id,
            tracking_number,
            origin_branch_id,
            destination_branch_id,
            current_branch_id,
            current_status_code,
            service_type,
            sender_name,
            sender_phone,
            recipient_name,
            recipient_phone,
            recipient_governorate,
            recipient_wilaya,
            recipient_address,
            item_description,
            pieces_count,
            product_value,
            collection_required,
            collection_amount,
            shipping_fee,
            sender_paid_amount,
            recipient_due_amount,
            employee_notes,
            created_at,
            updated_at
          `,
        )
        .single();

      if (error) {
        throw error;
      }

      if (
        publicNote.trim() ||
        internalNote.trim()
      ) {
        const {
          error: historyError,
        } = await supabase
          .from(
            "shipment_status_history",
          )
          .insert({
            shipment_id:
              shipment.id,

            previous_status_code:
              shipment.current_status_code,

            new_status_code:
              newStatus,

            branch_id:
              profile?.branchId ||
              shipment.current_branch_id,

            changed_by:
              profile!.id,

            public_note:
              publicNote.trim() ||
              null,

            internal_note:
              internalNote.trim() ||
              null,
          });

        if (historyError) {
          console.error(
            "Failed to save operation note:",
            historyError,
          );
        }
      }

      setShipment(
        data as ShipmentRecord,
      );

      setSuccessMessage(
        mode === "receive"
          ? "تم تأكيد استلام الشحنة في الفرع بنجاح."
          : "تم تأكيد تسليم الشحنة إلى المستلم بنجاح.",
      );
    } catch (error) {
      console.error(
        "Shipment operation failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? `تعذر تنفيذ العملية: ${error.message}`
          : "تعذر تنفيذ العملية.",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section
      className="shipment-operation-page"
      dir="rtl"
    >
      <div className="shipment-operation-heading">
        <button
          type="button"
          onClick={() =>
            navigate(
              "/staff/office",
            )
          }
        >
          <ArrowRight size={19} />

          العودة
        </button>

        <div>
          <span>
            عمليات الشحنات
          </span>

          <h1>
            {information.title}
          </h1>

          <p>
            {
              information.description
            }
          </p>
        </div>
      </div>

      <form
        className="shipment-operation-search"
        onSubmit={searchShipment}
      >
        <Search size={21} />

        <input
          type="text"
          value={trackingNumber}
          onChange={(event) => {
            setTrackingNumber(
              event.target.value,
            );

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="مثال: ROCK-MAIN-BRM-000001"
          aria-label="رقم التتبع"
          autoComplete="off"
          dir="ltr"
          required
        />

        <button
          type="submit"
          disabled={searching}
        >
          {searching ? (
            <>
              <LoaderCircle
                className="button-spinner"
                size={19}
              />

              جاري البحث...
            </>
          ) : (
            <>
              <PackageSearch
                size={19}
              />

              {
                information.buttonLabel
              }
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <div className="shipment-alert shipment-alert-error">
          <AlertCircle size={20} />

          <span>
            {errorMessage}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="shipment-alert shipment-alert-success">
          <CheckCircle2
            size={20}
          />

          <span>
            {successMessage}
          </span>
        </div>
      )}

      {!shipment && (
        <div className="shipment-operation-empty">
          <PackageSearch size={46} />

          <strong>
            أدخل رقم التتبع
          </strong>

          <p>
            ستظهر بيانات الشحنة هنا
            بعد العثور عليها.
          </p>
        </div>
      )}

      {shipment && (
        <>
          <article className="shipment-operation-result">
            <div className="shipment-result-header">
              <div>
                <span>
                  رقم التتبع
                </span>

                <h2 dir="ltr">
                  {
                    shipment.tracking_number
                  }
                </h2>
              </div>

              <div className="shipment-current-status">
                <span>
                  الحالة الحالية
                </span>

                <strong>
                  {getStatusName(
                    shipment.current_status_code,
                  )}
                </strong>
              </div>
            </div>

            <div className="shipment-result-grid">
              <div>
                <UserRound size={19} />

                <span>
                  المرسل
                </span>

                <strong>
                  {
                    shipment.sender_name
                  }
                </strong>

                <small dir="ltr">
                  {
                    shipment.sender_phone
                  }
                </small>
              </div>

              <div>
                <Phone size={19} />

                <span>
                  المستلم
                </span>

                <strong>
                  {
                    shipment.recipient_name
                  }
                </strong>

                <small dir="ltr">
                  {
                    shipment.recipient_phone
                  }
                </small>
              </div>

              <div>
                <Building2 size={19} />

                <span>
                  فرع الإرسال
                </span>

                <strong>
                  {getBranchName(
                    shipment.origin_branch_id,
                  )}
                </strong>
              </div>

              <div>
                <Building2 size={19} />

                <span>
                  فرع الوجهة
                </span>

                <strong>
                  {getBranchName(
                    shipment.destination_branch_id,
                  )}
                </strong>
              </div>

              <div>
                <Package size={19} />

                <span>
                  محتوى الشحنة
                </span>

                <strong>
                  {
                    shipment.item_description
                  }
                </strong>

                <small>
                  {
                    shipment.pieces_count
                  }{" "}
                  قطعة
                </small>
              </div>

              <div>
                <CircleDollarSign
                  size={19}
                />

                <span>
                  المطلوب من المستلم
                </span>

                <strong>
                  {formatMoney(
                    shipment.recipient_due_amount,
                  )}{" "}
                  ر.ع
                </strong>
              </div>
            </div>

            <div className="shipment-result-footer">
              <span>
                تم الإنشاء
              </span>

              <strong>
                {formatDate(
                  shipment.created_at,
                )}
              </strong>

              <span>
                آخر تحديث
              </span>

              <strong>
                {formatDate(
                  shipment.updated_at,
                )}
              </strong>
            </div>
          </article>

          {mode !== "search" && (
            <section className="shipment-operation-confirm">
              <h2>
                {mode === "receive"
                  ? "تأكيد استلام الشحنة"
                  : "تأكيد تسليم الشحنة"}
              </h2>

              <p>
                {mode === "receive"
                  ? "بعد التأكيد ستتحول حالة الشحنة إلى تم استلامها في فرع الوجهة."
                  : "بعد التأكيد ستتحول حالة الشحنة إلى تم التسليم."}
              </p>

              <div className="shipment-operation-notes">
                <label>
                  <span>
                    ملاحظة تظهر في
                    التتبع
                  </span>

                  <textarea
                    value={publicNote}
                    onChange={(
                      event,
                    ) =>
                      setPublicNote(
                        event.target
                          .value,
                      )
                    }
                    placeholder="ملاحظة اختيارية للعميل"
                    rows={3}
                  />
                </label>

                <label>
                  <span>
                    ملاحظة داخلية
                  </span>

                  <textarea
                    value={internalNote}
                    onChange={(
                      event,
                    ) =>
                      setInternalNote(
                        event.target
                          .value,
                      )
                    }
                    placeholder="ملاحظة للموظفين فقط"
                    rows={3}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={
                  updating ||
                  isFinalStatus(
                    shipment.current_status_code,
                  )
                }
                onClick={() =>
                  void performOperation()
                }
              >
                {updating ? (
                  <>
                    <LoaderCircle
                      className="button-spinner"
                      size={20}
                    />

                    جاري الحفظ...
                  </>
                ) : mode ===
                  "receive" ? (
                  <>
                    <PackageCheck
                      size={20}
                    />

                    تأكيد استلام الشحنة
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={20}
                    />

                    تأكيد تسليم الشحنة
                  </>
                )}
              </button>
            </section>
          )}
        </>
      )}
    </section>
  );
}
