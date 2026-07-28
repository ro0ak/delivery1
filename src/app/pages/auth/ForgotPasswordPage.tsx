import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Truck,
} from "lucide-react";
import { Link } from "react-router";
import { supabase } from "../../../utils/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    document.title = "استعادة كلمة المرور | ROCK Delivery";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("أدخل البريد الإلكتروني.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/login`,
        },
      );

      if (error) {
        setErrorMessage(
          "تعذر إرسال رابط استعادة كلمة المرور. تأكد من البريد وحاول مرة أخرى.",
        );
        return;
      }

      setSuccessMessage(
        "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.",
      );
    } catch (error) {
      console.error("Password reset error:", error);

      setErrorMessage(
        "حدث خطأ غير متوقع. حاول مرة أخرى.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="simple-page">
      <div className="simple-page__icon">
        <Truck size={44} />
      </div>

      <span>استعادة الحساب</span>
      <h1>نسيت كلمة المرور؟</h1>

      <p>
        أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
      </p>

      <form className="login-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="form-alert form-alert--error">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="form-alert">
            <CheckCircle2 size={19} />
            <span>{successMessage}</span>
          </div>
        )}

        <label className="form-group">
          <span>البريد الإلكتروني</span>

          <div className="form-input">
            <Mail size={19} />

            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="name@company.com"
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <LoaderCircle className="button-spinner" size={20} />
              جاري الإرسال...
            </>
          ) : (
            "إرسال رابط الاستعادة"
          )}
        </button>
      </form>

      <Link to="/login" className="secondary-button">
        <ArrowRight size={18} />
        العودة إلى تسجيل الدخول
      </Link>
    </main>
  );
}
