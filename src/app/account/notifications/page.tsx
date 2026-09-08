import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/primitives";

export default function NotificationsPage() {
  return (
    <div>
      <TopBar title="Notifications" />
      <div className="p-gutter">
        <EmptyState
          title="Notifications are coming soon"
          description="Appointment reminders and payment nudges will show up here."
        />
      </div>
    </div>
  );
}
