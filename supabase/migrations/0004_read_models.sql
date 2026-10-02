-- 0004_read_models.sql
-- Read models for the client. PostgREST exposes the `public` schema only, so reads go through
-- security_invoker views over the app tables: the caller's row level security still applies, and no
-- table or write path is widened. All writes stay on the public command functions from 0001–0003.

create view public.franchise_summaries
with (security_invoker = on) as
select
  f.id,
  f.name,
  f.is_default,
  f.archived_at,
  f.revision,
  f.pinned_revision_id,
  coalesce(p.player_count, 0) as player_count,
  coalesce(p.pending_field_count, 0) as pending_field_count
from app.franchises f
left join (
  select
    fp.franchise_id,
    count(distinct fp.id) as player_count,
    count(fld.franchise_player_id) filter (where fld.plan_value is not null) as pending_field_count
  from app.franchise_players fp
  left join app.franchise_player_fields fld on fld.franchise_player_id = fp.id
  group by fp.franchise_id
) p on p.franchise_id = f.id;

comment on view public.franchise_summaries is
  'Owner-visible franchise summaries (C0B-v2 §9 read models). Counts are computed from stored rows only; nothing is inferred or fabricated.';

create view public.franchise_players_view
with (security_invoker = on) as
select
  fp.id,
  fp.franchise_id,
  fp.origin,
  fp.custom_key,
  fp.full_name,
  fp.source_player_record_id,
  sp.source_id as source_id,
  sp.team,
  sp.listed_position,
  sp.archetype,
  sp.birthdate
from app.franchise_players fp
left join app.source_player_records sp on sp.id = fp.source_player_record_id;

comment on view public.franchise_players_view is
  'Franchise players with source-backed facts where they exist. Null means unknown, never zero (C0B-v2 §3).';

create view public.franchise_player_fields_view
with (security_invoker = on) as
select
  fld.franchise_player_id,
  fp.franchise_id,
  fld.field_key,
  fld.baseline_value,
  fld.plan_value,
  fld.field_class,
  fld.updated_at
from app.franchise_player_fields fld
join app.franchise_players fp on fp.id = fld.franchise_player_id;

comment on view public.franchise_player_fields_view is
  'Grouped editable fields: plan_value set means a pending change, baseline_value set means a recorded fact (C0B-v2 §3).';

grant select on public.franchise_summaries to authenticated;
grant select on public.franchise_players_view to authenticated;
grant select on public.franchise_player_fields_view to authenticated;
revoke all on public.franchise_summaries from anon;
revoke all on public.franchise_players_view from anon;
revoke all on public.franchise_player_fields_view from anon;
