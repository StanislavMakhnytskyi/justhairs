import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/primitives";

export default function OrdersPage() {
  return (
    <div>
      <TopBar title="Orders" />
      <div className="p-6">
        <EmptyState
          title="Orders are coming soon"
          description="Pay-later orders and receipts land in the next milestone."
        />
      </div>
    </div>
  );
}
