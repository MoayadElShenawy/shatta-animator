import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getGithubStatus } from "@/lib/github-status.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات ربط GitHub | Shatta Animator" },
      {
        name: "description",
        content: "اتبع خطوات ربط حساب GitHub بالمشروع وتابع حالة الاتصال لحظيًا.",
      },
      { property: "og:title", content: "إعدادات ربط GitHub | Shatta Animator" },
      {
        property: "og:description",
        content: "خطوات ربط GitHub وحالة الاتصال المباشرة داخل لوحة الإعدادات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const STEPS = [
  {
    title: "افتح إعدادات الموصّلات",
    detail: "من قائمة المشروع، اختر Connectors ثم ابحث عن GitHub.",
  },
  {
    title: "أنشئ اتصالًا جديدًا",
    detail: "سجّل الدخول بحساب GitHub أو الصق Personal Access Token بالصلاحيات المطلوبة.",
  },
  {
    title: "امنح صلاحية repo",
    detail: "لقراءة المستودعات الخاصة فعّل نطاق repo، أو public_repo للعامة فقط.",
  },
  {
    title: "اربط الاتصال بالمشروع",
    detail: "بعد اكتمال الربط يصبح المفتاح متاحًا للخادم وتتحدث الحالة بالأسفل تلقائيًا.",
  },
];

function SettingsPage() {
  const fetchStatus = useServerFn(getGithubStatus);
  const { data, isFetching, dataUpdatedAt, error } = useQuery({
    queryKey: ["github-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const state = !data
    ? { label: "جارٍ الفحص…", tone: "bg-muted text-muted-foreground" }
    : data.verified
      ? { label: "متصل", tone: "bg-primary text-primary-foreground" }
      : data.linked
        ? { label: "يحتاج مراجعة", tone: "bg-secondary text-secondary-foreground" }
        : { label: "غير متصل", tone: "bg-destructive text-destructive-foreground" };

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">إعدادات ربط GitHub</h1>
          <p className="text-sm text-muted-foreground">
            اتبع الخطوات التالية لربط حسابك، والحالة بالأسفل تتحدث كل 5 ثوانٍ.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">حالة الاتصال</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${state.tone}`}>
              {state.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {error
              ? `تعذر جلب الحالة: ${error instanceof Error ? error.message : String(error)}`
              : (data?.message ?? "جارٍ التحقق من الاتصال…")}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">مفتاح الاتصال</dt>
              <dd className="font-medium">{data?.linked ? "موجود" : "غير موجود"}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <dt className="text-muted-foreground">بوابة الاتصال</dt>
              <dd className="font-medium">{data?.gatewayReady ? "جاهزة" : "غير جاهزة"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {isFetching ? "جارٍ التحديث…" : `آخر تحديث: ${new Date(dataUpdatedAt).toLocaleTimeString("ar-EG")}`}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">خطوات الربط</h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
