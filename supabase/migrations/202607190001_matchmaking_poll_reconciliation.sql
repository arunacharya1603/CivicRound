-- Reconcile compatible waiting entries during status polling.
-- This closes the race where two nearly simultaneous queue inserts both commit
-- as waiting before either request observes the other.

create or replace function public.get_matchmaking_status()
returns table (
  match_status text,
  matched_room_id uuid,
  opponent_user_id uuid,
  opponent_name text,
  opponent_stance text,
  current_speaker_order smallint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  own_entry public.matchmaking_queue%rowtype;
  opponent_entry public.matchmaking_queue%rowtype;
  current_profile public.guest_profiles%rowtype;
  created_room_id uuid;
begin
  perform public.assert_current_user_can_participate();

  select q.*
  into own_entry
  from public.matchmaking_queue q
  where q.user_id = auth.uid();

  if not found or own_entry.expires_at <= now() then
    delete from public.matchmaking_queue q where q.user_id = auth.uid();
    return query
    select
      'expired'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::smallint;
    return;
  end if;

  if own_entry.status = 'matched' and own_entry.room_id is not null then
    return query
    select
      'matched'::text,
      own_entry.room_id,
      opponent.user_id,
      opponent.display_name,
      opponent.stance,
      mine.speaker_order
    from public.debate_participants mine
    join public.debate_participants opponent
      on opponent.room_id = mine.room_id
      and opponent.user_id <> mine.user_id
    where mine.room_id = own_entry.room_id
      and mine.user_id = auth.uid();
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(own_entry.topic_id),
    own_entry.duration_seconds
  );

  select q.*
  into own_entry
  from public.matchmaking_queue q
  where q.user_id = auth.uid()
  for update;

  if not found or own_entry.expires_at <= now() then
    delete from public.matchmaking_queue q where q.user_id = auth.uid();
    return query
    select
      'expired'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::smallint;
    return;
  end if;

  if own_entry.status = 'matched' and own_entry.room_id is not null then
    return query
    select
      'matched'::text,
      own_entry.room_id,
      opponent.user_id,
      opponent.display_name,
      opponent.stance,
      mine.speaker_order
    from public.debate_participants mine
    join public.debate_participants opponent
      on opponent.room_id = mine.room_id
      and opponent.user_id <> mine.user_id
    where mine.room_id = own_entry.room_id
      and mine.user_id = auth.uid();
    return;
  end if;

  select q.*
  into opponent_entry
  from public.matchmaking_queue q
  where q.user_id <> auth.uid()
    and q.status = 'waiting'
    and q.topic_id = own_entry.topic_id
    and q.duration_seconds = own_entry.duration_seconds
    and q.stance <> own_entry.stance
    and q.expires_at > now()
  order by q.joined_at
  for update skip locked
  limit 1;

  if not found then
    return query
    select
      'waiting'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::smallint;
    return;
  end if;

  select p.*
  into current_profile
  from public.guest_profiles p
  where p.user_id = auth.uid();

  if not found then
    raise exception 'Guest profile is required';
  end if;

  insert into public.debate_rooms (
    topic_id,
    duration_seconds,
    match_source
  )
  values (
    own_entry.topic_id,
    own_entry.duration_seconds,
    'queue'
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
        select p.display_name
        from public.guest_profiles p
        where p.user_id = opponent_entry.user_id
      ),
      opponent_entry.stance,
      1
    ),
    (
      created_room_id,
      auth.uid(),
      current_profile.display_name,
      own_entry.stance,
      2
    );

  update public.matchmaking_queue q
  set
    status = 'matched',
    room_id = created_room_id,
    expires_at = now() + interval '10 minutes'
  where q.user_id in (opponent_entry.user_id, auth.uid());

  return query
  select
    'matched'::text,
    created_room_id,
    opponent_entry.user_id,
    (
      select p.display_name
      from public.guest_profiles p
      where p.user_id = opponent_entry.user_id
    ),
    opponent_entry.stance,
    2::smallint;
end;
$$;
