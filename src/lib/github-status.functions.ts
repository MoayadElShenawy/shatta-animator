import { createServerFn } from "@tanstack/react-start";

export type GithubStatus = {
  linked: boolean;
  gatewayReady: boolean;
  verified: boolean;
  message: string;
  checkedAt: string;
};

export const getGithubStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<GithubStatus> => {
    const connectionKey = process.env["GITHUB_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const checkedAt = new Date().toISOString();

    if (!connectionKey) {
      return {
        linked: false,
        gatewayReady: Boolean(lovableKey),
        verified: false,
        message: "لا يوجد اتصال GitHub مرتبط بالمشروع بعد.",
        checkedAt,
      };
    }
    if (!lovableKey) {
      return {
        linked: true,
        gatewayReady: false,
        verified: false,
        message: "الاتصال مرتبط لكن مفتاح البوابة غير متاح على الخادم.",
        checkedAt,
      };
    }

    try {
      const res = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
        },
      });
      const body = await res.text();
      if (!res.ok) {
        return {
          linked: true,
          gatewayReady: true,
          verified: false,
          message: `فشل التحقق [${res.status}]: ${body.slice(0, 300)}`,
          checkedAt,
        };
      }
      let outcome = "unknown";
      try {
        outcome = (JSON.parse(body) as { outcome?: string }).outcome ?? "unknown";
      } catch {
        /* keep raw */
      }
      return {
        linked: true,
        gatewayReady: true,
        verified: outcome === "verified",
        message:
          outcome === "verified"
            ? "الاتصال يعمل بشكل سليم."
            : `نتيجة التحقق: ${outcome}. ${body.slice(0, 200)}`,
        checkedAt,
      };
    } catch (error) {
      return {
        linked: true,
        gatewayReady: true,
        verified: false,
        message: `تعذر الوصول للبوابة: ${error instanceof Error ? error.message : String(error)}`,
        checkedAt,
      };
    }
  },
);
