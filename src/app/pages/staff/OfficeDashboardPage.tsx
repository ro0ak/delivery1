import {
  FilePlus2,
  HandHelping,
  PackageCheck,
  PackageSearch,
  Printer,
  ReceiptText,
} from "lucide-react";

import { useNavigate } from "react-router";

interface OfficeAction {
  title: string;
  description: string;
  icon: typeof FilePlus2;
  path: string;
  enabled: boolean;
}

const officeActions: OfficeAction[] = [
  {
    title: "تسجيل شحنة جديدة",
    description:
      "تسجيل بيانات المرسل والمستلم وإنشاء رقم تتبع وإيصال.",
    icon: FilePlus2,
    path: "/shipments/new",
    enabled: true,
  },
  {
    title: "استلام شحنة",
    description:
      "البحث برقم التتبع وتأكيد استلام الشحنة في الفرع.",
    icon: HandHelping,
    path: "/shipments/receive",
    enabled: true,
  },
  {
    title: "تسليم للعميل",
    description:
      "البحث برقم التتبع وتأكيد تسليم الشحنة إلى المستلم.",
    icon: PackageCheck,
    path: "/shipments/deliver",
    enabled: true,
  },
  {
    title: "البحث عن شحنة",
    description:
      "عرض تفاصيل الشحنة وحالتها وسجل الحركة.",
    icon: PackageSearch,
    path: "/shipments/search",
    enabled: true,
  },
  {
    title: "الفواتير",
    description:
      "إنشاء وتعديل وطباعة إيصالات الشحنات.",
    icon: ReceiptText,
    path: "/invoices",
    enabled: false,
  },
  {
    title: "الطباعة",
    description:
      "طباعة إيصال العميل أو كشف الشحنات.",
    icon: Printer,
    path: "/print",
    enabled: false,
  },
];

export default function OfficeDashboardPage() {
  const navigate = useNavigate();

  function handleAction(
    action: OfficeAction,
  ) {
    if (action.enabled) {
      navigate(action.path);
    }
  }

  return (
    <section
      className="role-page"
      dir="rtl"
    >
      <div className="role-page__heading">
        <span>
          وضع المكتب
        </span>

        <h1>
          مهام موظف الفرع
        </h1>

        <p>
          نفّذ معاملات العملاء اليومية
          من شاشة واضحة وسريعة.
        </p>
      </div>

      <div className="role-action-grid">
        {officeActions.map(
          (action) => {
            const Icon = action.icon;

            return (
              <button
                type="button"
                key={action.title}
                disabled={!action.enabled}
                onClick={() =>
                  handleAction(action)
                }
                className={
                  action.enabled
                    ? "office-action-enabled"
                    : "office-action-disabled"
                }
              >
                <Icon size={25} />

                <strong>
                  {action.title}
                </strong>

                <span>
                  {action.description}
                </span>

                {!action.enabled && (
                  <small>
                    قريبًا
                  </small>
                )}
              </button>
            );
          },
        )}
      </div>

      <div className="role-placeholder">
        يمكنك الآن تسجيل شحنة جديدة،
        والبحث عن الشحنات، واستلامها في
        الفرع، وتأكيد تسليمها إلى
        العميل.
      </div>
    </section>
  );
}
