import { Suspense } from "react";
import { BookShell } from "@/components/ticket/BookShell";
import { TopBar } from "@/components/ui/TopBar";
import { getCatalog } from "@/lib/queries";
import { ServiceCategoryTabs } from "./ServiceCategoryTabs";

export const revalidate = 600;

export default async function ServicesPage() {
  const { services, staff, staffServices } = await getCatalog();
  const men = services.filter((s) => s.category.gender === "men");
  const women = services.filter((s) => s.category.gender === "women");

  return (
    <BookShell>
      <TopBar title="Services" />
      <div className="p-gutter pb-8">
        {/* KNOWN ISSUE (CODE_REVIEW.md #18): fallback={null} means the
            page's actual content — the service list — is an empty shell
            until client hydration resolves useSearchParams(). SkeletonList
            already exists in the design system and isn't used here. */}
        <Suspense fallback={null}>
          <ServiceCategoryTabs
            men={men}
            women={women}
            staff={staff}
            staffServices={staffServices}
          />
        </Suspense>
      </div>
    </BookShell>
  );
}
