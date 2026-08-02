import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import ProtectedRoute from "./components/ProtectedRoute";

import {
  useAuth,
  type UserRole,
} from "./contexts/AuthContext";

import DashboardLayout from "./layouts/DashboardLayout";
import { getRoleHome } from "./lib/roleRoutes";

import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

import TrackingPage from "./pages/public/TrackingPage";

import WorkModePage from "./pages/staff/WorkModePage";
import OfficeDashboardPage from "./pages/staff/OfficeDashboardPage";
import DeliveryDashboardPage from "./pages/staff/DeliveryDashboardPage";

import BranchManagerDashboardPage from "./pages/branch/BranchManagerDashboardPage";
import CompanyDashboardPage from "./pages/admin/CompanyDashboardPage";

import BranchesPage from "./pages/BranchesPage";
import EmployeesPage from "./pages/EmployeesPage";
import DriversPage from "./pages/DriversPage";
import CollectionsPage from "./pages/CollectionsPage";
import ExpensesPage from "./pages/ExpensesPage";
import SettingsPage from "./pages/SettingsPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";

import NewShipmentPage from "./pages/shipments/NewShipmentPage";
// 1. إضافة الاستيراد الجديد هنا
import ShipmentOperationsPage from "./pages/shipments/ShipmentOperationsPage";

const officeRoles: UserRole[] = [
  "super_admin",
  "branch_manager",
  "branch_employee",
  "operations",
];

function HomeRedirect() {
  const {
    loading,
    isAuthenticated,
    profile,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated || !profile) {
    return (
      <Navigate
        to="/tracking"
        replace
      />
    );
  }

  return (
    <Navigate
      to={getRoleHome(profile.role)}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomeRedirect />}
      />

      {/* صفحة العملاء العامة */}
      <Route
        path="/tracking"
        element={<TrackingPage />}
      />

      {/* دخول فريق العمل */}
      <Route
        path="/staff/login"
        element={<LoginPage />}
      />

      {/* تحويل الرابط القديم إلى الرابط الجديد */}
      <Route
        path="/login"
        element={
          <Navigate
            to="/staff/login"
            replace
          />
        }
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      {/* اختيار وضع الموظف */}
      <Route
        path="/staff/work-mode"
        element={
          <ProtectedRoute allowedRoles={officeRoles}>
            <WorkModePage />
          </ProtectedRoute>
        }
      />

      {/* واجهة التوصيل والسائق */}
      <Route
        path="/staff/delivery"
        element={
          <ProtectedRoute
            allowedRoles={[
              "driver",
              "branch_employee",
              "operations",
              "branch_manager",
              "super_admin",
            ]}
          >
            <DeliveryDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* الصفحات التي تستخدم القائمة الجانبية */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "branch_manager",
              "branch_employee",
              "accountant",
              "operations",
            ]}
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/shipments/new"
          element={
            <ProtectedRoute
              allowedRoles={officeRoles}
            >
              <NewShipmentPage />
            </ProtectedRoute>
          }
        />

        {/* 2. إضافة مسارات العمليات الجديدة هنا */}
        <Route
          path="/shipments/search"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
                "branch_employee",
                "accountant",
                "operations",
              ]}
            >
              <ShipmentOperationsPage
                mode="search"
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shipments/receive"
          element={
            <ProtectedRoute
              allowedRoles={officeRoles}
            >
              <ShipmentOperationsPage
                mode="receive"
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shipments/deliver"
          element={
            <ProtectedRoute
              allowedRoles={officeRoles}
            >
              <ShipmentOperationsPage
                mode="deliver"
              />
            </ProtectedRoute>
          }
        />

        {/* موظف المكتب */}
        <Route
          path="/staff/office"
          element={
            <ProtectedRoute allowedRoles={officeRoles}>
              <OfficeDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* مدير الفرع والمحاسب */}
        <Route
          path="/branch"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
                "accountant",
              ]}
            >
              <BranchManagerDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* المدير العام */}
        <Route
          path="/company"
          element={
            <ProtectedRoute
              allowedRoles={["super_admin"]}
            >
              <CompanyDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* إدارة الفروع */}
        <Route
          path="/branches"
          element={
            <ProtectedRoute
              allowedRoles={["super_admin"]}
            >
              <BranchesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
              ]}
            >
              <EmployeesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/drivers"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
                "operations",
              ]}
            >
              <DriversPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/collections"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
                "accountant",
              ]}
            >
              <CollectionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "branch_manager",
                "accountant",
              ]}
            >
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute
              allowedRoles={["super_admin"]}
            >
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* تحويل المسارات القديمة */}
      <Route
        path="/dashboard"
        element={<HomeRedirect />}
      />

      <Route
        path="/driver"
        element={
          <Navigate
            to="/staff/delivery"
            replace
          />
        }
      />

      <Route
        path="/unauthorized"
        element={<UnauthorizedPage />}
      />

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}
