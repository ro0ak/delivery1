import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calculator,
  CarFront,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth, type UserRole } from "../contexts/AuthContext";

interface MenuItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const allDashboardRoles: UserRole[] = [
  "super_admin",
  "branch_manager",
  "branch_employee",
  "accountant",
  "operations",
];

const menuItems: MenuItem[] = [
  {
    label: "لوحة التحكم",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: allDashboardRoles,
  },
  {
    label: "الشحنات",
    path: "/shipments",
    icon: Package,
    roles: allDashboardRoles,
  },
  {
    label: "تسجيل شحنة",
    path: "/shipments/new",
    icon: Boxes,
    roles: [
      "super_admin",
      "branch_manager",
      "branch_employee",
      "operations",
    ],
  },
  {
    label: "الرحلات",
    path: "/trips",
    icon: Truck,
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
    roles: ["super_admin", "branch_manager"],
  },
  {
    label: "السائقون",
    path: "/drivers",
    icon: CarFront,
    roles: ["super_admin", "branch_manager", "operations"],
  },
  {
    label: "العملاء والتجار",
    path: "/customers",
    icon: UserRound,
    roles: allDashboardRoles,
  },
  {
    label: "التحصيلات",
    path: "/collections",
    icon: CircleDollarSign,
    roles: ["super_admin", "branch_manager", "accountant"],
  },
  {
    label: "صندوق الفرع",
    path: "/cashbox",
    icon: WalletCards,
    roles: ["super_admin", "branch_manager", "accountant"],
  },
  {
    label: "المصروفات",
    path: "/expenses",
    icon: Receipt,
    roles: ["super_admin", "branch_manager", "accountant"],
  },
  {
    label: "الرواتب",
    path: "/payroll",
    icon: Calculator,
    roles: ["super_admin", "branch_manager", "accountant"],
  },
  {
    label: "التقارير",
    path: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "branch_manager", "accountant"],
  },
  {
    label: "سجل العمليات",
    path: "/audit-logs",
    icon: ClipboardList,
    roles: ["super_admin"],
  },
  {
    label: "الإعدادات",
    path: "/settings",
    icon: Settings,
    roles: ["super_admin"],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "المدير العام",
  branch_manager: "مدير الفرع",
  branch_employee: "موظف الفرع",
  driver: "السائق",
  accountant: "المحاسب",
  operations: "موظف العمليات",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile, logout } = useAuth();

  const visibleMenuItems = useMemo(() => {
    if (!profile) {
      return [];
    }

    return menuItems.filter((item) => item.roles.includes(profile.role));
  }, [profile]);

  const activeItem = visibleMenuItems.find((item) => {
    if (item.path === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    return location.pathname.startsWith(item.path);
  });

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-shell">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Truck size={26} />
          </div>

          <div>
            <strong>ROCK Delivery</strong>
            <span>نظام إدارة التوصيل</span>
          </div>

          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="sidebar-close"
            onClick={closeSidebar}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
                <ChevronLeft className="arrow" size={17} />
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">
            {profile?.fullName?.charAt(0) || "م"}
          </div>

          <div>
            <strong>{profile?.fullName || "مستخدم"}</strong>
            <span>
              {profile ? roleLabels[profile.role] : "مستخدم النظام"}
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
              aria-label="فتح القائمة"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div>
              <p>مرحبًا، {profile?.fullName || "مستخدم النظام"}</p>
              <h1>{activeItem?.label || "نظام التوصيل"}</h1>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="الإشعارات"
            >
              <Bell size={20} />
            </button>

            <div className="status">
              <ShieldCheck size={18} />
              <span>النظام متصل</span>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
