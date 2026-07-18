-- Serialize compatible matchmaking requests so two simultaneous users cannot both remain waiting.
-- Start live rooms with a short shared countdown so neither participant loses speaking time.

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
