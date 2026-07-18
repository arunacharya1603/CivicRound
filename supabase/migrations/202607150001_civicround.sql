create extension if not exists pgcrypto;

create table if not exists public.debate_topics (
  id text primary key,
  category text not null,
  statement text not null,
  context text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.debate_topics (id, category, statement, context)
values
  ('political-ad-verification', 'Technology & society', 'Social platforms should verify every political advertiser.', 'Accountability for paid political influence online.'),
  ('candidate-debate-requirement', 'Democratic process', 'Candidates should be required to join public debates.', 'Public scrutiny before election day.'),
  ('campaign-donation-cap', 'Campaign finance', 'Governments should cap individual campaign donations.', 'Limits on financial influence in elections.'),
  ('ai-political-labels', 'Artificial intelligence', 'AI-generated political media should carry a visible label.', 'Clear disclosure for synthetic campaign content.'),
  ('voting-age-sixteen', 'Voting rights', 'The voting age should be lowered to sixteen.', 'Earlier participation in democratic decisions.'),
  ('participatory-budgeting', 'Local government', 'Residents should directly allocate part of local budgets.', 'Community control over public spending.')
on conflict (id) do update set category = excluded.category, statement = excluded.statement, context = excluded.context, is_active = true;

create table if not exists public.guest_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  confirmed_adult_at timestamptz not null,
  accepted_rules_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debate_rooms (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.debate_topics(id),
  duration_seconds integer not null check (duration_seconds in (60, 120)),
  match_source text not null check (match_source in ('queue', 'invite')),
  status text not null default 'ready' check (status in ('ready', 'live', 'complete', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.debate_participants (
  room_id uuid not null references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  stance text not null check (stance in ('support', 'challenge')),
  speaker_order smallint not null check (speaker_order in (1, 2)),
  joined_at timestamptz not null default now(),
  ready_at timestamptz,
  left_at timestamptz,
  primary key (room_id, user_id),
  unique (room_id, speaker_order)
);

create table if not exists public.matchmaking_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  topic_id text not null references public.debate_topics(id),
  stance text not null check (stance in ('support', 'challenge')),
  duration_seconds integer not null check (duration_seconds in (60, 120)),
  room_id uuid references public.debate_rooms(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'matched')),
  joined_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  check ((status = 'waiting' and room_id is null) or (status = 'matched' and room_id is not null))
);

create table if not exists public.debate_invites (
  code uuid primary key default gen_random_uuid(),  creator_user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.debate_topics(id),
  creator_stance text not null check (creator_stance in ('support', 'challenge')),
  duration_seconds integer not null check (duration_seconds in (60, 120)),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.debate_rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  check ((claimed_by_user_id is null and room_id is null) or (claimed_by_user_id is not null and room_id is not null))
);

create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.user_restrictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  restricted_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  debate_room_id uuid not null references public.debate_rooms(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reported_display_name text not null,
  reason text not null check (reason in ('harassment_or_threats', 'hate_speech', 'explicit_content', 'impersonation', 'other_misconduct')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (debate_room_id, reporter_user_id, reported_user_id)
);

create table if not exists public.round_feedback (
  room_id uuid not null references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists matchmaking_lookup_idx on public.matchmaking_queue (topic_id, duration_seconds, stance, joined_at) where status = 'waiting';
create index if not exists matchmaking_expiry_idx on public.matchmaking_queue (expires_at);
create index if not exists debate_participant_user_idx on public.debate_participants (user_id, joined_at desc);
create index if not exists debate_room_status_idx on public.debate_rooms (status, created_at desc);
create index if not exists debate_invite_creator_idx on public.debate_invites (creator_user_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_rate_idx on public.reports (reporter_user_id, created_at desc);

alter table public.debate_topics enable row level security;
alter table public.guest_profiles enable row level security;
alter table public.debate_rooms enable row level security;
alter table public.debate_participants enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.debate_invites enable row level security;
alter table public.moderators enable row level security;
alter table public.user_restrictions enable row level security;
alter table public.reports enable row level security;
alter table public.round_feedback enable row level security;
revoke all on table public.debate_topics, public.guest_profiles, public.debate_rooms, public.debate_participants, public.matchmaking_queue, public.debate_invites, public.moderators, public.user_restrictions, public.reports, public.round_feedback from anon, authenticated;
grant select on table public.debate_topics, public.guest_profiles, public.debate_rooms, public.debate_participants, public.matchmaking_queue, public.debate_invites, public.reports, public.round_feedback to authenticated;

create or replace function public.is_room_participant(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.debate_participants p
    where p.room_id = p_room_id and p.user_id = auth.uid()
  );
$$;
drop policy if exists "active topics are visible to signed in users" on public.debate_topics;
create policy "active topics are visible to signed in users" on public.debate_topics for select to authenticated using (is_active);
drop policy if exists "guests can view their profile" on public.guest_profiles;
create policy "guests can view their profile" on public.guest_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "participants can view their rooms" on public.debate_rooms;
create policy "participants can view their rooms" on public.debate_rooms for select to authenticated using (public.is_room_participant(debate_rooms.id));
drop policy if exists "participants can view their matchup" on public.debate_participants;
create policy "participants can view their matchup" on public.debate_participants for select to authenticated using (public.is_room_participant(debate_participants.room_id));
drop policy if exists "guests can view their queue entry" on public.matchmaking_queue;
create policy "guests can view their queue entry" on public.matchmaking_queue for select to authenticated using (user_id = auth.uid());
drop policy if exists "invite participants can view an invite" on public.debate_invites;
create policy "invite participants can view an invite" on public.debate_invites for select to authenticated using (creator_user_id = auth.uid() or claimed_by_user_id = auth.uid());
drop policy if exists "reporters can view their reports" on public.reports;
create policy "reporters can view their reports" on public.reports for select to authenticated using (reporter_user_id = auth.uid());
drop policy if exists "participants can view their feedback" on public.round_feedback;
create policy "participants can view their feedback" on public.round_feedback for select to authenticated using (user_id = auth.uid());

create or replace function public.is_current_user_moderator()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.moderators m where m.user_id = auth.uid()); $$;

drop policy if exists "moderators can view reports" on public.reports;
create policy "moderators can view reports" on public.reports for select to authenticated using (public.is_current_user_moderator());

create or replace function public.assert_current_user_can_participate()
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (
    select 1 from public.user_restrictions r
    where r.user_id = auth.uid() and (r.restricted_until is null or r.restricted_until > now())
  ) then raise exception 'Account is restricted'; end if;
end;
$$;

create or replace function public.upsert_guest_profile(p_display_name text, p_confirmed_adult boolean, p_accepted_rules boolean)
returns table (user_id uuid, display_name text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare normalized_name text := btrim(p_display_name);
begin
  perform public.assert_current_user_can_participate();  if not coalesce(p_confirmed_adult, false) or not coalesce(p_accepted_rules, false) then raise exception 'Adult confirmation and rules acceptance are required'; end if;
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 32 then raise exception 'Display name must be between 2 and 32 characters'; end if;
  insert into public.guest_profiles (user_id, display_name, confirmed_adult_at, accepted_rules_at)
  values (auth.uid(), normalized_name, now(), now())
  on conflict on constraint guest_profiles_pkey do update
  set display_name = excluded.display_name,
      confirmed_adult_at = excluded.confirmed_adult_at,
      accepted_rules_at = excluded.accepted_rules_at,
      updated_at = now();
  return query select p.user_id, p.display_name from public.guest_profiles p where p.user_id = auth.uid();
end;
$$;

create or replace function public.join_matchmaking(p_topic_id text, p_stance text, p_duration_seconds integer)
returns table (match_status text, matched_room_id uuid, opponent_user_id uuid, opponent_name text, opponent_stance text, current_speaker_order smallint)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  current_profile public.guest_profiles%rowtype;
  own_entry public.matchmaking_queue%rowtype;
  opponent_entry public.matchmaking_queue%rowtype;
  created_room_id uuid;
begin
  perform public.assert_current_user_can_participate();
  if p_stance not in ('support', 'challenge') or p_duration_seconds not in (60, 120) then raise exception 'Invalid round setup'; end if;
  if not exists (select 1 from public.debate_topics t where t.id = p_topic_id and t.is_active) then raise exception 'Unknown debate topic'; end if;
  perform pg_advisory_xact_lock(hashtext(p_topic_id), p_duration_seconds);
  select p.* into current_profile from public.guest_profiles p where p.user_id = auth.uid();
  if not found then raise exception 'Guest profile is required'; end if;
  delete from public.matchmaking_queue q where q.expires_at <= now();
  select q.* into own_entry from public.matchmaking_queue q where q.user_id = auth.uid();
  if found and own_entry.status = 'matched' and own_entry.room_id is not null then
    return query select 'matched'::text, own_entry.room_id, opponent.user_id, opponent.display_name, opponent.stance, mine.speaker_order
    from public.debate_participants mine join public.debate_participants opponent on opponent.room_id = mine.room_id and opponent.user_id <> mine.user_id
    where mine.room_id = own_entry.room_id and mine.user_id = auth.uid();
    return;
  end if;
  delete from public.matchmaking_queue q where q.user_id = auth.uid();
  select q.* into opponent_entry from public.matchmaking_queue q
  where q.user_id <> auth.uid() and q.status = 'waiting' and q.topic_id = p_topic_id and q.duration_seconds = p_duration_seconds and q.stance <> p_stance and q.expires_at > now()
  order by q.joined_at for update skip locked limit 1;
  if found then
    insert into public.debate_rooms (topic_id, duration_seconds, match_source) values (p_topic_id, p_duration_seconds, 'queue') returning id into created_room_id;
    insert into public.debate_participants (room_id, user_id, display_name, stance, speaker_order)
    values
      (created_room_id, opponent_entry.user_id, (select p.display_name from public.guest_profiles p where p.user_id = opponent_entry.user_id), opponent_entry.stance, 1),
      (created_room_id, auth.uid(), current_profile.display_name, p_stance, 2);
    update public.matchmaking_queue q set status = 'matched', room_id = created_room_id, expires_at = now() + interval '10 minutes' where q.user_id = opponent_entry.user_id;
    insert into public.matchmaking_queue (user_id, topic_id, stance, duration_seconds, room_id, status, expires_at)
    values (auth.uid(), p_topic_id, p_stance, p_duration_seconds, created_room_id, 'matched', now() + interval '10 minutes');
    return query select 'matched'::text, created_room_id, opponent_entry.user_id, (select p.display_name from public.guest_profiles p where p.user_id = opponent_entry.user_id), opponent_entry.stance, 2::smallint;
    return;
  end if;
  insert into public.matchmaking_queue (user_id, topic_id, stance, duration_seconds, status, expires_at)
  values (auth.uid(), p_topic_id, p_stance, p_duration_seconds, 'waiting', now() + interval '2 minutes');
  return query select 'waiting'::text, null::uuid, null::uuid, null::text, null::text, null::smallint;
end;
$$;

create or replace function public.get_matchmaking_status()
returns table (match_status text, matched_room_id uuid, opponent_user_id uuid, opponent_name text, opponent_stance text, current_speaker_order smallint)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare own_entry public.matchmaking_queue%rowtype;
begin
  perform public.assert_current_user_can_participate();
  select q.* into own_entry from public.matchmaking_queue q where q.user_id = auth.uid();
  if not found or own_entry.expires_at <= now() then
    delete from public.matchmaking_queue q where q.user_id = auth.uid();
    return query select 'expired'::text, null::uuid, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;
  if own_entry.status = 'waiting' then
    return query select 'waiting'::text, null::uuid, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;
  return query select 'matched'::text, own_entry.room_id, opponent.user_id, opponent.display_name, opponent.stance, mine.speaker_order
  from public.debate_participants mine join public.debate_participants opponent on opponent.room_id = mine.room_id and opponent.user_id <> mine.user_id
  where mine.room_id = own_entry.room_id and mine.user_id = auth.uid();
end;
$$;

create or replace function public.cancel_matchmaking()
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.matchmaking_queue q where q.user_id = auth.uid() and q.status = 'waiting';
end;
$$;

create or replace function public.create_debate_invite(p_topic_id text, p_stance text, p_duration_seconds integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare invite_code uuid;
begin
  perform public.assert_current_user_can_participate();
  if p_stance not in ('support', 'challenge') or p_duration_seconds not in (60, 120) then raise exception 'Invalid invite setup'; end if;
  if not exists (select 1 from public.debate_topics t where t.id = p_topic_id and t.is_active) then raise exception 'Unknown debate topic'; end if;
  if not exists (select 1 from public.guest_profiles p where p.user_id = auth.uid()) then raise exception 'Guest profile is required'; end if;
  delete from public.debate_invites i where i.creator_user_id = auth.uid() and i.room_id is null;
  insert into public.debate_invites (creator_user_id, topic_id, creator_stance, duration_seconds)
  values (auth.uid(), p_topic_id, p_stance, p_duration_seconds) returning code into invite_code;
  return invite_code;
end;
$$;

create or replace function public.claim_debate_invite(p_invite_code uuid)
returns table (match_status text, matched_room_id uuid, opponent_user_id uuid, opponent_name text, opponent_stance text, current_speaker_order smallint)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  invite public.debate_invites%rowtype;
  current_profile public.guest_profiles%rowtype;
  creator_profile public.guest_profiles%rowtype;
  created_room_id uuid;
begin
  perform public.assert_current_user_can_participate();  select i.* into invite from public.debate_invites i where i.code = p_invite_code for update;
  if not found or invite.expires_at <= now() then raise exception 'Invite has expired'; end if;
  if invite.creator_user_id = auth.uid() then raise exception 'You cannot claim your own invite'; end if;
  select p.* into current_profile from public.guest_profiles p where p.user_id = auth.uid();
  select p.* into creator_profile from public.guest_profiles p where p.user_id = invite.creator_user_id;
  if current_profile.user_id is null or creator_profile.user_id is null then raise exception 'Guest profile is required'; end if;
  if invite.room_id is not null then
    if invite.claimed_by_user_id <> auth.uid() then raise exception 'Invite has already been claimed'; end if;
    return query select 'matched'::text, invite.room_id, creator_profile.user_id, creator_profile.display_name, invite.creator_stance, 2::smallint;
    return;
  end if;
  insert into public.debate_rooms (topic_id, duration_seconds, match_source) values (invite.topic_id, invite.duration_seconds, 'invite') returning id into created_room_id;
  insert into public.debate_participants (room_id, user_id, display_name, stance, speaker_order)
  values
    (created_room_id, creator_profile.user_id, creator_profile.display_name, invite.creator_stance, 1),
    (created_room_id, current_profile.user_id, current_profile.display_name, case when invite.creator_stance = 'support' then 'challenge' else 'support' end, 2);
  update public.debate_invites i set claimed_by_user_id = auth.uid(), room_id = created_room_id where i.code = p_invite_code;
  return query select 'matched'::text, created_room_id, creator_profile.user_id, creator_profile.display_name, invite.creator_stance, 2::smallint;
end;
$$;

create or replace function public.get_debate_invite_status(p_invite_code uuid)
returns table (match_status text, matched_room_id uuid, opponent_user_id uuid, opponent_name text, opponent_stance text, current_speaker_order smallint)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare invite public.debate_invites%rowtype;
begin
  perform public.assert_current_user_can_participate();
  select i.* into invite from public.debate_invites i where i.code = p_invite_code and (i.creator_user_id = auth.uid() or i.claimed_by_user_id = auth.uid());
  if not found or invite.expires_at <= now() then
    return query select 'expired'::text, null::uuid, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;
  if invite.room_id is null then
    return query select 'waiting'::text, null::uuid, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;
  return query select 'matched'::text, invite.room_id, opponent.user_id, opponent.display_name, opponent.stance, mine.speaker_order
  from public.debate_participants mine join public.debate_participants opponent on opponent.room_id = mine.room_id and opponent.user_id <> mine.user_id
  where mine.room_id = invite.room_id and mine.user_id = auth.uid();
end;
$$;

create or replace function public.cancel_debate_invite(p_invite_code uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.debate_invites i where i.code = p_invite_code and i.creator_user_id = auth.uid() and i.room_id is null;
end;
$$;

create or replace function public.mark_debate_room_ready(p_room_id uuid)
returns table (room_status text, started_at timestamptz, server_now timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare room public.debate_rooms%rowtype; ready_count integer;
begin
  perform public.assert_current_user_can_participate();
  select r.* into room from public.debate_rooms r where r.id = p_room_id for update;
  if not found or not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Room membership required'; end if;
  if room.status not in ('ready', 'live') then return query select room.status, room.started_at, now(); return; end if;
  update public.debate_participants p set ready_at = coalesce(p.ready_at, now()) where p.room_id = p_room_id and p.user_id = auth.uid();
  select count(*) into ready_count from public.debate_participants p where p.room_id = p_room_id and p.ready_at is not null and p.left_at is null;
  if ready_count = 2 and room.status = 'ready' then
    update public.debate_rooms r
    set status = 'live', started_at = now() + interval '3 seconds'
    where r.id = p_room_id
    returning r.* into room;
    delete from public.matchmaking_queue q where q.room_id = p_room_id;
  else
    select r.* into room from public.debate_rooms r where r.id = p_room_id;
  end if;
  return query select room.status, room.started_at, now();
end;
$$;

create or replace function public.get_debate_room_state(p_room_id uuid)
returns table (room_status text, started_at timestamptz, ended_at timestamptz, server_now timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare room public.debate_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Room membership required'; end if;
  select r.* into room from public.debate_rooms r where r.id = p_room_id;
  return query select room.status, room.started_at, room.ended_at, now();
end;
$$;

create or replace function public.complete_debate_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
declare room public.debate_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select r.* into room from public.debate_rooms r where r.id = p_room_id for update;
  if not found or not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Room membership required'; end if;
  if room.status = 'complete' then return true; end if;
  if room.status <> 'live' or room.started_at is null or now() < room.started_at + make_interval(secs => room.duration_seconds - 2) then return false; end if;
  update public.debate_rooms r set status = 'complete', ended_at = now() where r.id = p_room_id;
  return true;
end;
$$;

create or replace function public.leave_debate_room(p_room_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp
as $$
declare room public.debate_rooms%rowtype; final_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select r.* into room from public.debate_rooms r where r.id = p_room_id for update;
  if not found or not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Room membership required'; end if;
  update public.debate_participants p set left_at = coalesce(p.left_at, now()) where p.room_id = p_room_id and p.user_id = auth.uid();
  final_status := room.status;
  if room.status = 'ready' then final_status := 'cancelled';
  elsif room.status = 'live' then
    if room.started_at is not null and now() >= room.started_at + make_interval(secs => room.duration_seconds - 2) then final_status := 'complete'; else final_status := 'cancelled'; end if;
  end if;  if final_status <> room.status then update public.debate_rooms r set status = final_status, ended_at = now() where r.id = p_room_id; end if;
  delete from public.matchmaking_queue q where q.room_id = p_room_id;
  return final_status;
end;
$$;

create or replace function public.submit_debate_report(p_room_id uuid, p_reported_user_id uuid, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare report_id uuid; reported_name text; normalized_details text := nullif(btrim(coalesce(p_details, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_reported_user_id = auth.uid() then raise exception 'You cannot report yourself'; end if;
  if p_reason not in ('harassment_or_threats', 'hate_speech', 'explicit_content', 'impersonation', 'other_misconduct') then raise exception 'Invalid report reason'; end if;
  if normalized_details is not null and char_length(normalized_details) > 500 then raise exception 'Report details are too long'; end if;
  if not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Reporter is not a room participant'; end if;
  select p.display_name into reported_name from public.debate_participants p where p.room_id = p_room_id and p.user_id = p_reported_user_id;
  if reported_name is null then raise exception 'Reported user is not a room participant'; end if;
  if (select count(*) from public.reports r where r.reporter_user_id = auth.uid() and r.created_at > now() - interval '10 minutes') >= 5 then raise exception 'Report rate limit exceeded'; end if;
  insert into public.reports (debate_room_id, reporter_user_id, reported_user_id, reported_display_name, reason, details)
  values (p_room_id, auth.uid(), p_reported_user_id, reported_name, p_reason, normalized_details)
  on conflict (debate_room_id, reporter_user_id, reported_user_id) do update set reason = excluded.reason, details = excluded.details, status = 'open', updated_at = now()
  returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.submit_round_feedback(p_room_id uuid, p_tags text[])
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare normalized_tags text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.debate_participants p where p.room_id = p_room_id and p.user_id = auth.uid()) then raise exception 'Room membership required'; end if;
  select coalesce(array_agg(distinct tag), '{}') into normalized_tags from unnest(coalesce(p_tags, '{}')) tag where tag in ('respectful', 'clear', 'thoughtful');
  insert into public.round_feedback (room_id, user_id, tags) values (p_room_id, auth.uid(), normalized_tags)
  on conflict (room_id, user_id) do update set tags = excluded.tags, updated_at = now();
end;
$$;

revoke all on function public.is_current_user_moderator() from public;
revoke all on function public.is_room_participant(uuid) from public;
revoke all on function public.assert_current_user_can_participate() from public;
revoke all on function public.upsert_guest_profile(text, boolean, boolean) from public;
revoke all on function public.join_matchmaking(text, text, integer) from public;
revoke all on function public.get_matchmaking_status() from public;
revoke all on function public.cancel_matchmaking() from public;
revoke all on function public.create_debate_invite(text, text, integer) from public;
revoke all on function public.claim_debate_invite(uuid) from public;
revoke all on function public.get_debate_invite_status(uuid) from public;
revoke all on function public.cancel_debate_invite(uuid) from public;revoke all on function public.mark_debate_room_ready(uuid) from public;
revoke all on function public.get_debate_room_state(uuid) from public;
revoke all on function public.complete_debate_room(uuid) from public;
revoke all on function public.leave_debate_room(uuid) from public;
revoke all on function public.submit_debate_report(uuid, uuid, text, text) from public;
revoke all on function public.submit_round_feedback(uuid, text[]) from public;

grant execute on function public.is_current_user_moderator() to authenticated;
grant execute on function public.is_room_participant(uuid) to authenticated;
grant execute on function public.upsert_guest_profile(text, boolean, boolean) to authenticated;
grant execute on function public.join_matchmaking(text, text, integer) to authenticated;
grant execute on function public.get_matchmaking_status() to authenticated;
grant execute on function public.cancel_matchmaking() to authenticated;
grant execute on function public.create_debate_invite(text, text, integer) to authenticated;
grant execute on function public.claim_debate_invite(uuid) to authenticated;
grant execute on function public.get_debate_invite_status(uuid) to authenticated;
grant execute on function public.cancel_debate_invite(uuid) to authenticated;
grant execute on function public.mark_debate_room_ready(uuid) to authenticated;
grant execute on function public.get_debate_room_state(uuid) to authenticated;
grant execute on function public.complete_debate_room(uuid) to authenticated;
grant execute on function public.leave_debate_room(uuid) to authenticated;
grant execute on function public.submit_debate_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.submit_round_feedback(uuid, text[]) to authenticated;
