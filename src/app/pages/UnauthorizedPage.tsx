import { ShieldX } from "lucide-react";
import { Link } from "react-router";

export default function UnauthorizedPage() {
  return (
    <main className="simple-page">
      <div className="simple-page__icon">
        <ShieldX size={44} />
      </div>

      <span>403</span>
      <h1>لا تملك صلاحية الوصول</h1>

      <p>
        حسابك لا يملك الصلاحية المطلوبة لفتح هذه الصفحة.
      </p>

      <Link to="/dashboard" className="primary-button">
        العودة إلى لوحة التحكم
      </Link>
    </main>
  );
}
