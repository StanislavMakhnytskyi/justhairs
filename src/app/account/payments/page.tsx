import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/primitives";

export default function PaymentsPage() {
  return (
    <div>
      <TopBar title="Payments" />
      <div className="p-6">
        <EmptyState
          title="Payments are coming soon"
          description="Stripe checkout and payment history arrive with orders."
        />
      </div>
    </div>
  );
}
