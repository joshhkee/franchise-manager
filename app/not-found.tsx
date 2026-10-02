import Link from "next/link";
import { PageHeader } from "../components/page-header";

export default function NotFound() {
  return (
    <div>
      <PageHeader
        title="Page not found"
        description="That route is not part of the planning shell."
      />
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium hover:bg-surface-muted"
      >
        Back to Overview
      </Link>
    </div>
  );
}
