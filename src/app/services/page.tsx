import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { getCatalog } from "@/lib/queries";
import { ServiceCategoryTabs } from "./ServiceCategoryTabs";

export const revalidate = 600;

export default async function ServicesPage() {
  const { services } = await getCatalog();
  const men = services.filter((s) => s.category.gender === "men");
  const women = services.filter((s) => s.category.gender === "women");

  return (
    <AppShell>
      <TopBar title="Services" />
      <div className="p-gutter">
        <Suspense fallback={null}>
          <ServiceCategoryTabs men={men} women={women} />
        </Suspense>
      </div>
    </AppShell>
  );
}
