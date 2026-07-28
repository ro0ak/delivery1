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
  PackageCheck,
  Truck,
} from "lucide-react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";
import {
  useAuth,
  type UserRole,
} from "../../contexts/AuthContext";

interface LoginLocationState {
  from?: string;
}

function getDefaultRoute(
  role: UserRole,
): string {
  if (role === "driver") {
    return "/driver";
  }

  return "/dashboard";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    document.title =
      "تسجيل الدخول | ROCK Delivery";
  }, []);

  if (
    !loading &&
    isAuthenticated &&
    profile
  ) {
    return (
      <Navigate
        to={getDefaultRoute(profile.role)}
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

    setErrorMessage("");
    setSubmitting(true);

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

      const defaultRoute = result.role
        ? getDefaultRoute(result.role)
        : "/dashboard";

      const canUseRequestedPath =
        requestedPath &&
        requestedPath !== "/login" &&
        !(
          result.role === "driver" &&
          requestedPath !== "/driver"
        );

      navigate(
        canUseRequestedPath
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
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual__overlay" />

        <div className="login-visual__content">
          <div className="login-logo">
            <Truck size={31} />
          </div>

          <p className="login-visual__eyebrow">
            ROCK DELIVERY MANAGEMENT
          </p>

          <h1>
            إدارة جميع عمليات التوصيل
            <span>من مكان واحد</span>
          </h1>

          <p>
            نظام متكامل لإدارة الفروع
            والشحنات والرحلات والسائقين
            والتحصيلات بصورة آمنة ومنظمة.
          </p>

          <div className="login-features">
            <div>
              <PackageCheck size={21} />

              <span>
                تتبع دقيق لكل شحنة
              </span>
            </div>

            <div>
              <LockKeyhole size={21} />

              <span>
                صلاحيات وحماية حسب الوظيفة
                والفرع
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-mobile-brand">
            <div className="login-logo">
              <Truck size={25} />
            </div>

            <div>
              <strong>
                ROCK Delivery
              </strong>

              <span>
                نظام إدارة التوصيل
              </span>
            </div>
          </div>

          <div className="login-heading">
            <span>مرحبًا بعودتك</span>

            <h2>
              تسجيل الدخول إلى النظام
            </h2>

            <p>
              أدخل بيانات الحساب المخصصة لك
              من إدارة الشركة.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
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
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  disabled={submitting}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
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
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                  disabled={submitting}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                  className="password-toggle"
                  disabled={submitting}
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
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

            <div className="login-options">
              <label>
                <input
                  type="checkbox"
                  disabled={submitting}
                />

                <span>تذكرني</span>
              </label>

              <Link to="/forgot-password">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              className="primary-button login-submit"
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
                "تسجيل الدخول"
              )}
            </button>
          </form>

          <div className="login-tracking-link">
            <span>
              هل أنت عميل وتريد معرفة حالة
              شحنتك؟
            </span>

            <Link to="/tracking">
              تتبع شحنتك من هنا
            </Link>
          </div>

          <p className="login-footer">
            الدخول مخصص لموظفي الشركة
            والسائقين فقط
          </p>
        </div>
      </section>
    </main>
  );
}
