import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-page__icon">
        <Construction size={36} />
      </div>

      <span>المرحلة الأولى</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="placeholder-page__message">
        تم تجهيز الصفحة والمسار. سيتم إضافة الجداول والنماذج
        والربط مع Supabase في المرحلة الخاصة بهذا القسم.
      </div>
    </section>
  );
}
