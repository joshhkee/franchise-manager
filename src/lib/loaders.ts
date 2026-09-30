import {
  buildResolveContext,
  getCallHistory,
  getDepthChart,
  getDepthSlotVocabulary,
  getFormations,
  getLeague,
  getPlaybooks,
  getRoster,
  getSubs,
  getTeams,
} from '@/db/repo';

/**
 * Just the identity the chrome needs: which team is "mine" and its palette.
 *
 * Deliberately forgiving — the layout renders on the login screen and during
 * first-run before the database has been migrated, so a missing database must
 * degrade to the neutral theme instead of throwing.
 */
export async function loadTeamIdentity() {
  try {
    const [league, teams] = await Promise.all([getLeague(), getTeams()]);
    const userTeam =
      teams.find((team) => team.id === league?.userTeamId) ??
      teams.find((team) => team.isUserTeam) ??
      null;
    return { league, userTeam };
  } catch {
    return { league: null, userTeam: null };
  }
}

export async function loadOverview() {
  const [league, teams, roster] = await Promise.all([getLeague(), getTeams(), getRoster()]);
  const userTeam = teams.find((team) => team.id === league?.userTeamId) ?? teams[0] ?? null;
  return { league, teams, roster, userTeam };
}

/** Everything the personnel screens need: formations plus a resolved plan context. */
export async function loadPlan() {
  const formations = await getFormations();
  const [contextData, playbooks, league, teams, subs] = await Promise.all([
    buildResolveContext('plan', formations),
    getPlaybooks(),
    getLeague(),
    getTeams(),
    getSubs('plan'),
  ]);
  return {
    formations,
    ctx: contextData.ctx,
    roster: contextData.roster,
    playbooks,
    league,
    teams,
    subs,
  };
}

export async function loadGameAndPlan() {
  const [game, plan, vocabulary] = await Promise.all([
    getDepthChart('game'),
    getDepthChart('plan'),
    getDepthSlotVocabulary(),
  ]);
  return { game, plan, vocabulary };
}

export async function loadTendency() {
  return getCallHistory();
}
