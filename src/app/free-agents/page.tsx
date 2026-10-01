import { redirect } from 'next/navigation';

/**
 * The unsigned pool now lives inside the all-players stats table, where it is one option
 * on the teams checklist instead of a near-duplicate screen. Kept as a redirect so the
 * bookmark, the nav history and the dashboard card all still land somewhere useful.
 */
export default function FreeAgentsPage() {
  redirect('/players?filters=1&team=FA');
}
