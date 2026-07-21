-- Product modes, persistent competitor profiles, rated matchmaking,
-- verdict storage, forfeits, history, and appeals.

alter table public.debate_rooms
  add column if not exists mode text not null default 'casual',
  add column if not exists is_rated boolean not null default false,
  add column if not exists rules_version text not null default '2026-07-21',
  add column if not exists rules_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists winner_user_id uuid references auth.users(id),
  add column if not exists forfeit_user_id uuid references auth.users(id),
  add column if not exists judge_status text not null default 'not_requested',
  add column if not exists scorecard jsonb,
  add column if not exists rating_processed_at timestamptz;

alter table public.matchmaking_queue
  add column if not exists mode text not null default 'casual',
  add column if not exists is_rated boolean not null default false,
  add column if not exists rating_snapshot integer;

alter table public.debate_invites
  add column if not exists mode text not null default 'challenge',
  add column if not exists is_rated boolean not null default false,
  add column if not exists rules_snapshot jsonb not null default '{}'::jsonb;

alter table public.debate_rooms
  drop constraint if exists debate_rooms_mode_check;
alter table public.debate_rooms
  add constraint debate_rooms_mode_check
  check (mode in ('casual', 'ranked', 'challenge', 'practice'));

alter table public.matchmaking_queue
  drop constraint if exists matchmaking_queue_mode_check;
alter table public.matchmaking_queue
  add constraint matchmaking_queue_mode_check
  check (mode in ('casual', 'ranked'));

alter table public.debate_invites
  drop constraint if exists debate_invites_mode_check;
alter table public.debate_invites
  add constraint debate_invites_mode_check
  check (mode = 'challenge');

alter table public.debate_rooms
  drop constraint if exists debate_rooms_match_source_check;
alter table public.debate_rooms
  add constraint debate_rooms_match_source_check
  check (match_source in ('queue', 'invite', 'ai'));

create table if not exists public.competitor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  handle text not null unique check (handle ~ '^[a-z0-9_]{2,24}$'),
  rating integer not null default 1200 check (rating >= 100),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  forfeits integer not null default 0 check (forfeits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating_before integer not null,
  rating_delta integer not null,
  rating_after integer not null,
  reason text not null check (reason in ('verdict', 'forfeit', 'correction')),
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.match_appeals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 12 and 500),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'upheld', 'denied')),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists matchmaking_mode_rating_idx
  on public.matchmaking_queue
  (mode, topic_id, duration_seconds, stance, rating_snapshot, joined_at)
  where status = 'waiting';
create index if not exists debate_rooms_mode_history_idx
  on public.debate_rooms (mode, is_rated, created_at desc);
create index if not exists rating_events_user_history_idx
  on public.rating_events (user_id, created_at desc);

alter table public.competitor_profiles enable row level security;
alter table public.rating_events enable row level security;
alter table public.match_appeals enable row level security;

revoke all on table
  public.competitor_profiles,
  public.rating_events,
  public.match_appeals
from anon, authenticated;

grant select on table
  public.competitor_profiles,
  public.rating_events,
  public.match_appeals
to authenticated;

drop policy if exists "competitors can view their profile"
  on public.competitor_profiles;
create policy "competitors can view their profile"
  on public.competitor_profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "competitors can view their rating events"
  on public.rating_events;
create policy "competitors can view their rating events"
  on public.rating_events
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "competitors can view their appeals"
  on public.match_appeals;
create policy "competitors can view their appeals"
  on public.match_appeals
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.assert_persistent_competitor()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Ranked play requires a persistent account';
  end if;
  if not exists (
    select 1
    from public.competitor_profiles p
    where p.user_id = auth.uid()
  ) then
    raise exception 'Competitor profile required';
  end if;
end;
$$;

create or replace function public.upsert_competitor_profile(
  p_display_name text,
  p_handle text
)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  rating integer,
  matches_played integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name text := btrim(p_display_name);
  normalized_handle text := lower(btrim(p_handle));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Anonymous identities cannot create competitor profiles';
  end if;
  if char_length(normalized_name) not between 2 and 32
    or normalized_handle !~ '^[a-z0-9_]{2,24}$' then
    raise exception 'Invalid competitor profile';
  end if;

  insert into public.competitor_profiles (
    user_id,
    display_name,
    handle
  )
  values (
    auth.uid(),
    normalized_name,
    normalized_handle
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    handle = excluded.handle,
    updated_at = now();

  return query
  select
    profile.user_id,
    profile.display_name,
    profile.handle,
    profile.rating,
    profile.matches_played
  from public.competitor_profiles profile
  where profile.user_id = auth.uid();
end;
$$;

create or replace function public.join_mode_matchmaking(
  p_topic_id text,
  p_stance text,
  p_duration_seconds integer,
  p_mode text,
  p_is_rated boolean
)
returns table (
  match_status text,
  matched_room_id uuid,
  opponent_user_id uuid,
  opponent_name text,
  opponent_stance text,
  current_speaker_order smallint,
  match_mode text,
  is_rated boolean,
  opponent_rating integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  own_profile public.competitor_profiles%rowtype;
  own_entry public.matchmaking_queue%rowtype;
  opponent_entry public.matchmaking_queue%rowtype;
  created_room_id uuid;
begin
  if p_mode <> 'ranked' or not p_is_rated then
    raise exception 'This endpoint is reserved for ranked matchmaking';
  end if;
  perform public.assert_current_user_can_participate();
  perform public.assert_persistent_competitor();

  if p_stance not in ('support', 'challenge')
    or p_duration_seconds not in (60, 120) then
    raise exception 'Invalid round setup';
  end if;
  if not exists (
    select 1
    from public.debate_topics topic
    where topic.id = p_topic_id and topic.is_active
  ) then
    raise exception 'Unknown debate topic';
  end if;

  select profile.*
  into own_profile
  from public.competitor_profiles profile
  where profile.user_id = auth.uid();

  perform pg_advisory_xact_lock(
    hashtext(p_mode || ':' || p_topic_id),
    p_duration_seconds
  );

  delete from public.matchmaking_queue queue
  where queue.expires_at <= now();

  select queue.*
  into own_entry
  from public.matchmaking_queue queue
  where queue.user_id = auth.uid();

  if found
    and own_entry.status = 'matched'
    and own_entry.room_id is not null then
    return query
    select
      'matched'::text,
      own_entry.room_id,
      opponent.user_id,
      opponent.display_name,
      opponent.stance,
      mine.speaker_order,
      room.mode,
      room.is_rated,
      opponent_profile.rating
    from public.debate_participants mine
    join public.debate_participants opponent
      on opponent.room_id = mine.room_id
      and opponent.user_id <> mine.user_id
    join public.debate_rooms room on room.id = mine.room_id
    left join public.competitor_profiles opponent_profile
      on opponent_profile.user_id = opponent.user_id
    where mine.room_id = own_entry.room_id
      and mine.user_id = auth.uid();
    return;
  end if;

  delete from public.matchmaking_queue queue
  where queue.user_id = auth.uid();

  select queue.*
  into opponent_entry
  from public.matchmaking_queue queue
  where queue.user_id <> auth.uid()
    and queue.status = 'waiting'
    and queue.mode = 'ranked'
    and queue.is_rated
    and queue.topic_id = p_topic_id
    and queue.duration_seconds = p_duration_seconds
    and queue.stance <> p_stance
    and queue.expires_at > now()
    and abs(coalesce(queue.rating_snapshot, 1200) - own_profile.rating) <= 250
  order by
    abs(coalesce(queue.rating_snapshot, 1200) - own_profile.rating),
    queue.joined_at
  for update skip locked
  limit 1;

  if found then
    insert into public.debate_rooms (
      topic_id,
      duration_seconds,
      match_source,
      mode,
      is_rated,
      rules_snapshot
    )
    values (
      p_topic_id,
      p_duration_seconds,
      'queue',
      'ranked',
      true,
      jsonb_build_object(
        'turns', 'strict',
        'judge', 'ai',
        'forfeitPenalty', 24,
        'appeals', true
      )
    )
    returning id into created_room_id;

    insert into public.debate_participants (
      room_id,
      user_id,
      display_name,
      stance,
      speaker_order
    )
    values
      (
        created_room_id,
        opponent_entry.user_id,
        (
          select profile.display_name
          from public.competitor_profiles profile
          where profile.user_id = opponent_entry.user_id
        ),
        opponent_entry.stance,
        1
      ),
      (
        created_room_id,
        auth.uid(),
        own_profile.display_name,
        p_stance,
        2
      );

    update public.matchmaking_queue queue
    set
      status = 'matched',
      room_id = created_room_id,
      expires_at = now() + interval '10 minutes'
    where queue.user_id = opponent_entry.user_id;

    insert into public.matchmaking_queue (
      user_id,
      topic_id,
      stance,
      duration_seconds,
      room_id,
      status,
      expires_at,
      mode,
      is_rated,
      rating_snapshot
    )
    values (
      auth.uid(),
      p_topic_id,
      p_stance,
      p_duration_seconds,
      created_room_id,
      'matched',
      now() + interval '10 minutes',
      'ranked',
      true,
      own_profile.rating
    );

    return query
    select
      'matched'::text,
      created_room_id,
      opponent_entry.user_id,
      (
        select profile.display_name
        from public.competitor_profiles profile
        where profile.user_id = opponent_entry.user_id
      ),
      opponent_entry.stance,
      2::smallint,
      'ranked'::text,
      true,
      coalesce(opponent_entry.rating_snapshot, 1200);
    return;
  end if;

  insert into public.matchmaking_queue (
    user_id,
    topic_id,
    stance,
    duration_seconds,
    status,
    expires_at,
    mode,
    is_rated,
    rating_snapshot
  )
  values (
    auth.uid(),
    p_topic_id,
    p_stance,
    p_duration_seconds,
    'waiting',
    now() + interval '2 minutes',
    'ranked',
    true,
    own_profile.rating
  );

  return query
  select
    'waiting'::text,
    null::uuid,
    null::uuid,
    null::text,
    null::text,
    null::smallint,
    'ranked'::text,
    true,
    null::integer;
end;
$$;

create or replace function public.get_mode_matchmaking_status()
returns table (
  match_status text,
  matched_room_id uuid,
  opponent_user_id uuid,
  opponent_name text,
  opponent_stance text,
  current_speaker_order smallint,
  match_mode text,
  is_rated boolean,
  opponent_rating integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  own_entry public.matchmaking_queue%rowtype;
begin
  perform public.assert_persistent_competitor();
  select queue.*
  into own_entry
  from public.matchmaking_queue queue
  where queue.user_id = auth.uid();

  if not found or own_entry.expires_at <= now() then
    delete from public.matchmaking_queue queue
    where queue.user_id = auth.uid();
    return query
    select
      'expired'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::smallint,
      'ranked'::text,
      true,
      null::integer;
    return;
  end if;

  return query
  select *
  from public.join_mode_matchmaking(
    own_entry.topic_id,
    own_entry.stance,
    own_entry.duration_seconds,
    own_entry.mode,
    own_entry.is_rated
  );
end;
$$;

create or replace function public.create_mode_debate_invite(
  p_topic_id text,
  p_stance text,
  p_duration_seconds integer,
  p_mode text,
  p_is_rated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite_code uuid;
begin
  perform public.assert_current_user_can_participate();
  if p_mode <> 'challenge'
    or p_stance not in ('support', 'challenge')
    or p_duration_seconds not in (60, 120) then
    raise exception 'Invalid challenge setup';
  end if;
  if p_is_rated then
    perform public.assert_persistent_competitor();
  end if;

  delete from public.debate_invites invite
  where invite.creator_user_id = auth.uid()
    and invite.room_id is null;

  insert into public.debate_invites (
    creator_user_id,
    topic_id,
    creator_stance,
    duration_seconds,
    mode,
    is_rated,
    rules_snapshot
  )
  values (
    auth.uid(),
    p_topic_id,
    p_stance,
    p_duration_seconds,
    'challenge',
    p_is_rated,
    jsonb_build_object(
      'turns', 'strict',
      'judge', case when p_is_rated then 'ai' else 'scorecard' end,
      'directRematch', true
    )
  )
  returning code into invite_code;

  return invite_code;
end;
$$;

create or replace function public.claim_mode_debate_invite(
  p_invite_code uuid
)
returns table (
  match_status text,
  matched_room_id uuid,
  opponent_user_id uuid,
  opponent_name text,
  opponent_stance text,
  current_speaker_order smallint,
  match_mode text,
  is_rated boolean,
  opponent_rating integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite public.debate_invites%rowtype;
  claimed record;
begin
  select candidate.*
  into invite
  from public.debate_invites candidate
  where candidate.code = p_invite_code;

  if not found then
    raise exception 'Challenge not found';
  end if;
  if invite.is_rated then
    perform public.assert_persistent_competitor();
  end if;

  select *
  into claimed
  from public.claim_debate_invite(p_invite_code);

  update public.debate_rooms room
  set
    mode = invite.mode,
    is_rated = invite.is_rated,
    rules_snapshot = invite.rules_snapshot
  where room.id = claimed.matched_room_id;

  return query
  select
    claimed.match_status,
    claimed.matched_room_id,
    claimed.opponent_user_id,
    claimed.opponent_name,
    claimed.opponent_stance,
    claimed.current_speaker_order,
    invite.mode,
    invite.is_rated,
    opponent_profile.rating
  from public.competitor_profiles opponent_profile
  where opponent_profile.user_id = claimed.opponent_user_id
  union all
  select
    claimed.match_status,
    claimed.matched_room_id,
    claimed.opponent_user_id,
    claimed.opponent_name,
    claimed.opponent_stance,
    claimed.current_speaker_order,
    invite.mode,
    invite.is_rated,
    null::integer
  where not exists (
    select 1
    from public.competitor_profiles opponent_profile
    where opponent_profile.user_id = claimed.opponent_user_id
  );
end;
$$;

create or replace function public.submit_match_appeal(
  p_room_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  appeal_id uuid;
  normalized_reason text := btrim(p_reason);
begin
  perform public.assert_persistent_competitor();
  if char_length(normalized_reason) not between 12 and 500 then
    raise exception 'Appeal reason must be between 12 and 500 characters';
  end if;
  if not exists (
    select 1
    from public.debate_rooms room
    join public.debate_participants participant
      on participant.room_id = room.id
    where room.id = p_room_id
      and room.is_rated
      and participant.user_id = auth.uid()
  ) then
    raise exception 'Rated room membership required';
  end if;

  insert into public.match_appeals (room_id, user_id, reason)
  values (p_room_id, auth.uid(), normalized_reason)
  on conflict (room_id, user_id) do update
  set
    reason = excluded.reason,
    status = 'submitted',
    updated_at = now()
  returning id into appeal_id;

  return appeal_id;
end;
$$;

create or replace function public.create_ai_practice_room(
  p_topic_id text,
  p_stance text,
  p_duration_seconds integer,
  p_difficulty text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_room_id uuid;
  participant_name text;
begin
  perform public.assert_current_user_can_participate();
  if p_stance not in ('support', 'challenge')
    or p_duration_seconds not in (60, 120)
    or p_difficulty not in ('rookie', 'challenger', 'expert') then
    raise exception 'Invalid AI practice setup';
  end if;
  if not exists (
    select 1
    from public.debate_topics topic
    where topic.id = p_topic_id and topic.is_active
  ) then
    raise exception 'Unknown debate topic';
  end if;

  select coalesce(competitor.display_name, guest.display_name)
  into participant_name
  from (select auth.uid() as user_id) session_user_row
  left join public.competitor_profiles competitor
    on competitor.user_id = session_user_row.user_id
  left join public.guest_profiles guest
    on guest.user_id = session_user_row.user_id;

  if participant_name is null then
    raise exception 'Participant profile required';
  end if;

  insert into public.debate_rooms (
    topic_id,
    duration_seconds,
    match_source,
    status,
    started_at,
    mode,
    is_rated,
    rules_snapshot
  )
  values (
    p_topic_id,
    p_duration_seconds,
    'ai',
    'live',
    now(),
    'practice',
    false,
    jsonb_build_object(
      'difficulty', p_difficulty,
      'rating_effect', 'none',
      'opponent_type', 'ai'
    )
  )
  returning id into created_room_id;

  insert into public.debate_participants (
    room_id,
    user_id,
    display_name,
    stance,
    speaker_order,
    ready_at
  )
  values (
    created_room_id,
    auth.uid(),
    participant_name,
    p_stance,
    1,
    now()
  );

  return created_room_id;
end;
$$;

create or replace function public.forfeit_ranked_room(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  room public.debate_rooms%rowtype;
  winner_id uuid;
  loser_profile public.competitor_profiles%rowtype;
  winner_profile public.competitor_profiles%rowtype;
begin
  perform public.assert_persistent_competitor();
  select candidate.*
  into room
  from public.debate_rooms candidate
  where candidate.id = p_room_id
  for update;

  if not found
    or not room.is_rated
    or room.mode not in ('ranked', 'challenge') then
    raise exception 'Rated room required';
  end if;
  if not exists (
    select 1
    from public.debate_participants participant
    where participant.room_id = p_room_id
      and participant.user_id = auth.uid()
  ) then
    raise exception 'Room membership required';
  end if;
  if room.rating_processed_at is not null then
    return room.status;
  end if;

  select participant.user_id
  into winner_id
  from public.debate_participants participant
  where participant.room_id = p_room_id
    and participant.user_id <> auth.uid()
  limit 1;

  select profile.*
  into loser_profile
  from public.competitor_profiles profile
  where profile.user_id = auth.uid()
  for update;
  select profile.*
  into winner_profile
  from public.competitor_profiles profile
  where profile.user_id = winner_id
  for update;

  update public.competitor_profiles profile
  set
    rating = greatest(100, profile.rating - 24),
    matches_played = profile.matches_played + 1,
    losses = profile.losses + 1,
    forfeits = profile.forfeits + 1,
    updated_at = now()
  where profile.user_id = auth.uid();

  update public.competitor_profiles profile
  set
    rating = profile.rating + 12,
    matches_played = profile.matches_played + 1,
    wins = profile.wins + 1,
    updated_at = now()
  where profile.user_id = winner_id;

  insert into public.rating_events (
    room_id,
    user_id,
    rating_before,
    rating_delta,
    rating_after,
    reason
  )
  values
    (
      p_room_id,
      auth.uid(),
      loser_profile.rating,
      -24,
      greatest(100, loser_profile.rating - 24),
      'forfeit'
    ),
    (
      p_room_id,
      winner_id,
      winner_profile.rating,
      12,
      winner_profile.rating + 12,
      'forfeit'
    );

  update public.debate_rooms candidate
  set
    status = 'complete',
    ended_at = now(),
    winner_user_id = winner_id,
    forfeit_user_id = auth.uid(),
    judge_status = 'not_required',
    rating_processed_at = now()
  where candidate.id = p_room_id;

  delete from public.matchmaking_queue queue
  where queue.room_id = p_room_id;

  return 'complete';
end;
$$;

revoke all on function public.assert_persistent_competitor() from public, anon;
revoke all on function public.upsert_competitor_profile(text, text) from public, anon;
revoke all on function public.join_mode_matchmaking(text, text, integer, text, boolean) from public, anon;
revoke all on function public.get_mode_matchmaking_status() from public, anon;
revoke all on function public.create_mode_debate_invite(text, text, integer, text, boolean) from public, anon;
revoke all on function public.claim_mode_debate_invite(uuid) from public, anon;
revoke all on function public.submit_match_appeal(uuid, text) from public, anon;
revoke all on function public.create_ai_practice_room(text, text, integer, text) from public, anon;
revoke all on function public.forfeit_ranked_room(uuid) from public, anon;

grant execute on function public.upsert_competitor_profile(text, text)
  to authenticated;
grant execute on function public.join_mode_matchmaking(text, text, integer, text, boolean)
  to authenticated;
grant execute on function public.get_mode_matchmaking_status()
  to authenticated;
grant execute on function public.create_mode_debate_invite(text, text, integer, text, boolean)
  to authenticated;
grant execute on function public.claim_mode_debate_invite(uuid)
  to authenticated;
grant execute on function public.submit_match_appeal(uuid, text)
  to authenticated;
grant execute on function public.create_ai_practice_room(text, text, integer, text)
  to authenticated;
grant execute on function public.forfeit_ranked_room(uuid)
  to authenticated;
