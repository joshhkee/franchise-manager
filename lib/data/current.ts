import { cookies } from "next/headers";
import { FRANCHISE_COOKIE } from "../actions/state";
import { listFranchises, type FranchiseSummary, type Loaded } from "./franchises";

export interface FranchiseContext {
  summaries: FranchiseSummary[];
  current: FranchiseSummary | null;
}

/**
 * The active franchise is a preference, never a permission: the cookie only
 * chooses among franchises the database already returned for this owner.
 */
export async function loadFranchiseContext(): Promise<Loaded<FranchiseContext>> {
  const result = await listFranchises();
  if (!result.ok) return result;

  const store = await cookies();
  const selectedId = store.get(FRANCHISE_COOKIE)?.value;
  const summaries = result.data;

  const current =
    summaries.find((franchise) => franchise.id === selectedId) ??
    summaries.find((franchise) => franchise.isDefault && !franchise.archivedAt) ??
    summaries.find((franchise) => !franchise.archivedAt) ??
    summaries[0] ??
    null;

  return { ok: true, data: { summaries, current } };
}
