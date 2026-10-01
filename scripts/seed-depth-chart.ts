import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { getLeague, getTeams, seedDepthChartFromRoster, setUserTeam } from '@/db/repo';

/**
 * Build a depth chart from a real Madden 27 roster.
 *
 * The import gives the app 32 flat player lists and no chart, so every screen that
 * reads roles — `/team`, `/depth-chart`, `/scheme`, `/checklist` — has nothing to show
 * until you seed one. This is that step: it runs
 * [`buildTeamDepthChart`](src/domain/depthChartSeed.ts) over a team's imported players
 * and writes the result to the depth-chart layers.
 *
 *   npm run seed:chart                              # your team, both layers
 *   npm run seed:chart -- --team=ATL                # a specific team
 *   npm run seed:chart -- --team=ATL --user-team    # ... and play as Atlanta
 *   npm run seed:chart -- --team=ATL --force        # replace a chart you have edited
 *   npm run seed:chart -- --layer=plan              # leave the in-game layer alone
 *
 * The result is a **starting point**: it is derived from position and overall, not
 * read from the game, and it is refused outright when the chart is not empty unless
 * `--force` is passed.
 */

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const teamArg = argValue('team');
const layerArg = argValue('layer');
const force = process.argv.includes('--force');
const makeTeam = process.argv.includes('--user-team');

console.log(`Seeding a depth chart into ${databaseDescription()}...`);
await applyMigrations();

try {
  const [league, teams] = await Promise.all([getLeague(), getTeams()]);
  const teamId = teamArg ?? league?.userTeamId ?? null;
  if (!teamId) {
    throw new Error('No team given and no user team set. Pass --team=ATL.');
  }

  const team = teams.find((entry) => entry.id === teamId);
  if (!team) {
    throw new Error(
      `Unknown team "${teamId}". Known team ids: ${teams.map((entry) => entry.id).join(', ')}.`,
    );
  }

  const layers = layerArg === 'game' ? ['game'] : layerArg === 'plan' ? ['plan'] : ['game', 'plan'];
  const result = await seedDepthChartFromRoster(team.id, {
    layers: layers as ('game' | 'plan')[],
    force,
  });
  if (makeTeam) await setUserTeam(team.id);

  console.log('');
  console.log(
    `${team.name} (${team.abbr}): ${result.players} players, ${result.placed} ranked spots across ${result.layers.join(' + ')}.`,
  );
  console.log(
    `${result.starters} starting jobs filled${makeTeam ? `, and ${team.abbr} is now your team` : ''}.`,
  );
  if (result.empty.length) console.log(`Nobody eligible for: ${result.empty.join(', ')}.`);
  for (const note of result.notes) console.log(`- ${note}`);
  console.log('\nOpen /depth-chart to edit it. This is a starting point, not Madden\'s chart.');
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}

await closeDb();
