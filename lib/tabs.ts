export type TabItem = {
  value: string;
  label: string;
};

// Section-view tab definitions live here so pages and tests share one source of truth
// (the `?view=`/`?side=` values are the contract for those URLs).
export const lineupsTabs: TabItem[] = [
  { value: "depth", label: "Depth Chart" },
  { value: "formations", label: "Formation Subs" },
];

export const gmTabs: TabItem[] = [
  { value: "roster", label: "Roster" },
  { value: "trade-block", label: "Trade Block" },
  { value: "trade-targets", label: "Trade Targets" },
  { value: "assets", label: "Assets & Moves" },
];

export const coachTabs: TabItem[] = [
  { value: "scheme", label: "Scheme & Playbook" },
  { value: "gaps", label: "Personnel Gaps" },
  { value: "identity", label: "Formation Identity" },
];

export const gamedayTabs: TabItem[] = [
  { value: "offense", label: "Offense" },
  { value: "defense", label: "Defense" },
];
