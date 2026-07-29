import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Truck,
} from "lucide-react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";

import { useAuth } from "../../contexts/AuthContext";
import { getRoleHome } from "../../lib/roleRoutes";

interface LoginLocationState {
  from?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    profile,
    isAuthenticated,
    loading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    document.title =
      "دخول فريق العمل | ROCK Delivery";
  }, []);

  if (
    !loading &&
    isAuthenticated &&
    profile
  ) {
    return (
      <Navigate
        to={getRoleHome(profile.role)}
        replace
      />
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const result = await login(
        email,
        password,
      );

      if (!result.success) {
        setErrorMessage(
          result.message ||
            "تعذر تسجيل الدخول.",
        );

        return;
      }

      const state =
        location.state as LoginLocationState | null;

      const requestedPath =
        typeof state?.from === "string"
          ? state.from
          : null;

      const userRole =
        result.role ||
        profile?.role ||
        "branch_employee";

      const defaultRoute =
        getRoleHome(userRole);

      const shouldUseRequestedPath =
        requestedPath &&
        requestedPath !== "/staff/login" &&
        requestedPath !== "/login";

      navigate(
        shouldUseRequestedPath
          ? requestedPath
          : defaultRoute,
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Login page error:",
        error,
      );

      setErrorMessage(
        "حدث خطأ غير متوقع. حاول مرة أخرى.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="staff-login"
      dir="rtl"
    >
      <section className="staff-login__visual">
        <div className="staff-login__brand">
          <Truck size={31} />
        </div>

        <span>
          ROCK DELIVERY OPERATIONS
        </span>

        <h1>
          مساحة عمل واحدة،
          <br />
          لكل فريق التوصيل.
        </h1>

        <p>
          دخول آمن للموظفين والسائقين
          ومديري الفروع والإدارة العامة.
        </p>

        <div className="staff-login__trust">
          <ShieldCheck size={21} />

          <span>
            صلاحيات حسب الحساب والفرع
          </span>
        </div>
      </section>

      <section className="staff-login__form-side">
        <form
          className="staff-login__form"
          onSubmit={handleSubmit}
        >
          <div className="staff-login__mobile-logo">
            <div>
              <Truck size={25} />
            </div>

            <strong>
              ROCK Delivery
            </strong>
          </div>

          <span className="staff-login__eyebrow">
            بوابة فريق العمل
          </span>

          <h2>تسجيل الدخول</h2>

          <p>
            استخدم الحساب الذي أنشأته
            إدارة الشركة.
          </p>

          {errorMessage && (
            <div className="form-alert form-alert--error">
              <AlertCircle size={19} />

              <span>
                {errorMessage}
              </span>
            </div>
          )}

          <label className="form-group">
            <span>
              البريد الإلكتروني
            </span>

            <div className="form-input">
              <Mail size={19} />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="name@company.com"
                autoComplete="email"
                inputMode="email"
                disabled={submitting}
                required
              />
            </div>
          </label>

          <label className="form-group">
            <span>
              كلمة المرور
            </span>

            <div className="form-input">
              <LockKeyhole size={19} />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
                disabled={submitting}
                required
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "إخفاء كلمة المرور"
                    : "إظهار كلمة المرور"
                }
                disabled={submitting}
                onClick={() =>
                  setShowPassword(
                    (currentValue) =>
                      !currentValue,
                  )
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </label>

          <Link
            className="staff-login__forgot"
            to="/forgot-password"
          >
            نسيت كلمة المرور؟
          </Link>

          <button
            className="staff-login__submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle
                  className="button-spinner"
                  size={20}
                />

                جاري تسجيل الدخول...
              </>
            ) : (
              "دخول النظام"
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
