import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth, type UserRole } from "./contexts/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import TrackingPage from "./pages/public/TrackingPage";
import DashboardPage from "./pages/DashboardPage";
import DriverDashboardPage from "./pages/DriverDashboardPage";
import BranchesPage from "./pages/BranchesPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";

const dashboardRoles: UserRole[] = [
  "super_admin",
  "branch_manager",
  "branch_employee",
  "accountant",
  "operations",
];

function HomeRedirect() {
  const { loading, isAuthenticated, profile } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/tracking" replace />;
  }

  return (
    <Navigate
      to={profile?.role === "driver" ? "/driver" : "/dashboard"}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/tracking" element={<TrackingPage />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={dashboardRoles}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/shipments"
          element={
            <PlaceholderPage
              title="إدارة الشحنات"
              description="عرض الشحنات والبحث والتصفية وتحديث الحالات."
            />
          }
        />

        <Route
          path="/shipments/new"
          element={
            <PlaceholderPage
              title="تسجيل شحنة جديدة"
              description="تسجيل بيانات المرسل والمستلم والمسار والمبالغ."
            />
          }
        />

        <Route
          path="/trips"
          element={
            <PlaceholderPage
              title="الرحلات بين الفروع"
              description="إنشاء الرحلات وإضافة الشحنات وتأكيد الاستلام."
            />
          }
        />

        <Route
          path="/branches"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <BranchesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "branch_manager"]}>
              <PlaceholderPage
                title="إدارة الموظفين"
                description="إدارة الموظفين ورواتبهم وصلاحياتهم."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/drivers"
          element={
            <PlaceholderPage
              title="إدارة السائقين"
              description="إدارة السائقين والمركبات والتحصيلات."
            />
          }
        />

        <Route
          path="/customers"
          element={
            <PlaceholderPage
              title="العملاء والتجار"
              description="إدارة العملاء والتجار والأسعار الخاصة."
            />
          }
        />

        <Route
          path="/collections"
          element={
            <PlaceholderPage
              title="التحصيلات"
              description="متابعة مبالغ التحصيل والتسويات."
            />
          }
        />

        <Route
          path="/cashbox"
          element={
            <PlaceholderPage
              title="صندوق الفرع"
              description="المقبوضات والمصروفات والإغلاق اليومي."
            />
          }
        />

        <Route
          path="/expenses"
          element={
            <PlaceholderPage
              title="المصروفات"
              description="تسجيل المصروفات ورفع الفواتير واعتمادها."
            />
          }
        />

        <Route
          path="/payroll"
          element={
            <PlaceholderPage
              title="الرواتب"
              description="الرواتب والعمولات والسلف والخصومات."
            />
          }
        />

        <Route
          path="/reports"
          element={
            <PlaceholderPage
              title="التقارير"
              description="التقارير اليومية والشهرية والسنوية."
            />
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <PlaceholderPage
                title="سجل العمليات"
                description="مراجعة العمليات والتعديلات الحساسة."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <PlaceholderPage
                title="الإعدادات"
                description="إدارة هوية الشركة والأسعار والعمولات."
              />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
