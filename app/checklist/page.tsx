import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";

export default function ChecklistPage() {
  return (
    <div>
      <PageHeader
        title="Checklist"
        description="Final differences to apply in Madden — confirmations correct app records only."
      />
      <div className="mt-4">
        <EmptyState
          title="No pending game changes"
          detail="Final differences, reviewed confirmations, and bounded undo arrive with lineup planning (C2B)."
          hint="Confirmation will never imply console synchronization."
        />
      </div>
    </div>
  );
}
