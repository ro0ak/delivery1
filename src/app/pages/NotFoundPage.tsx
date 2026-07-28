import { FileQuestion } from "lucide-react";
import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="simple-page">
      <div className="simple-page__icon">
        <FileQuestion size={44} />
      </div>

      <span>404</span>
      <h1>الصفحة غير موجودة</h1>

      <p>
        الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت.
      </p>

      <Link to="/tracking" className="primary-button">
        العودة إلى صفحة التتبع
      </Link>
    </main>
  );
}
