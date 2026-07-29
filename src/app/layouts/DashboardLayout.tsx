import {
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  Bell,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router";

import {
  useAuth,
  type UserRole,
} from "../contexts/AuthContext";

interface MenuItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    label: "الإدارة العامة",
    path: "/company",
    icon: LayoutDashboard,
    roles: ["super_admin"],
  },
  {
    label: "لوحة الفرع",
    path: "/branch",
    icon: BarChart3,
    roles: [
      "super_admin",
      "branch_manager",
      "accountant",
    ],
  },
  {
    label: "وضع المكتب",
    path: "/staff/office",
    icon: Package,
    roles: [
      "super_admin",
      "branch_manager",
      "branch_employee",
      "operations",
    ],
  },
  {
    label: "الفروع",
    path: "/branches",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    label: "الموظفون",
    path: "/employees",
    icon: Users,
    roles: [
      "super_admin",
      "branch_manager",
    ],
  },
  {
    label: "السائقون",
    path: "/drivers",
    icon: Truck,
    roles: [
      "super_admin",
      "branch_manager",
      "operations",
    ],
  },
  {
    label: "التحصيلات",
    path: "/collections",
    icon: CircleDollarSign,
    roles: [
      "super_admin",
      "branch_manager",
      "accountant",
    ],
  },
  {
    label: "المصروفات",
    path: "/expenses",
    icon: Receipt,
    roles: [
      "super_admin",
      "branch_manager",
      "accountant",
    ],
  },
  {
    label: "الإعدادات",
    path: "/settings",
    icon: Settings,
    roles: ["super_admin"],
  },
];

const roleLabels: Record<
  UserRole,
  string
> = {
  super_admin: "المدير العام",
  branch_manager: "مدير الفرع",
  branch_employee: "موظف الفرع",
  driver: "السائق",
  accountant: "المحاسب",
  operations: "موظف العمليات",
};

export default function DashboardLayout() {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const location = useLocation();

  const {
    profile,
    logout,
  } = useAuth();

  const visibleMenuItems = useMemo(() => {
    if (!profile) {
      return [];
    }

    return menuItems.filter((item) =>
      item.roles.includes(profile.role),
    );
  }, [profile]);

  const activeItem =
    visibleMenuItems.find((item) =>
      location.pathname.startsWith(
        item.path,
      ),
    );

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div
      className="dashboard-shell"
      dir="rtl"
    >
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Truck size={26} />
          </div>

          <div>
            <strong>
              ROCK Delivery
            </strong>

            <span>
              نظام إدارة التوصيل
            </span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            aria-label="إغلاق القائمة"
            onClick={closeSidebar}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map(
            ({
              label,
              path,
              icon: Icon,
            }) => (
              <NavLink
                key={path}
                to={path}
                onClick={closeSidebar}
                className={({
                  isActive,
                }) =>
                  `sidebar-link ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >
                <Icon size={20} />

                <span>{label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">
            {profile?.fullName?.charAt(0) ||
              "م"}
          </div>

          <div>
            <strong>
              {profile?.fullName ||
                "مستخدم"}
            </strong>

            <span>
              {profile
                ? roleLabels[profile.role]
                : ""}
            </span>
          </div>

          <button
            type="button"
            title="تسجيل الخروج"
            onClick={() => void logout()}
          >
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-start">
            <button
              type="button"
              className="mobile-menu"
              aria-label="فتح القائمة"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu size={24} />
            </button>

            <div>
              <p>
                مرحبًا،{" "}
                {profile?.fullName ||
                  "مستخدم النظام"}
              </p>

              <h1>
                {activeItem?.label ||
                  "نظام التوصيل"}
              </h1>
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="الإشعارات"
          >
            <Bell size={20} />
          </button>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
