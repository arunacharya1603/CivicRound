-- Consent-based transcription, model-backed judging, and authoritative Elo settlement.

alter table public.debate_participants
  add column if not exists judge_consent_at timestamptz;

alter table public.debate_rooms
  add column if not exists judge_model text,
  add column if not exists judge_prompt_version text,
  add column if not exists judge_completed_at timestamptz,
  add column if not exists judge_error_code text;

alter table public.debate_rooms
  drop constraint if exists debate_rooms_judge_status_check;
alter table public.debate_rooms
  add constraint debate_rooms_judge_status_check
  check (
    judge_status in (
      'not_requested', 'collecting', 'queued', 'processing', 'complete',
      'failed', 'no_decision', 'not_required'
    )
  );

create table if not exists public.debate_turn_transcripts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.debate_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  speaker_order smallint not null check (speaker_order in (1, 2)),
  phase_id text not null check (
    phase_id in (
      'speaker-one-opening', 'speaker-two-opening',
      'speaker-one-closing', 'speaker-two-closing'
    )
  ),
  turn_sequence smallint not null check (turn_sequence between 1 and 4),
  transcript text not null check (char_length(transcript) between 1 and 8000),
  transcription_model text not null,
  audio_duration_seconds numeric(8, 2),
  created_at timestamptz not null default now(),
  unique (room_id, phase_id),
  unique (room_id, turn_sequence)
);

create table if not exists public.debate_judge_runs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.debate_rooms(id) on delete cascade,
  status text not null default 'processing'
    check (status in ('processing', 'complete', 'failed', 'no_decision')),
  provider text not null default 'groq',
  model text not null,
  prompt_version text not null,
  transcript_hash text not null,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists debate_turn_transcripts_room_sequence_idx
  on public.debate_turn_transcripts (room_id, turn_sequence);

alter table public.debate_turn_transcripts enable row level security;
alter table public.debate_judge_runs enable row level security;

revoke all on table
  public.debate_turn_transcripts,
  public.debate_judge_runs
from anon, authenticated;

grant select on table
  public.debate_turn_transcripts,
  public.debate_judge_runs
to authenticated;

drop policy if exists participants_can_view_debate_transcripts
  on public.debate_turn_transcripts;
create policy participants_can_view_debate_transcripts
  on public.debate_turn_transcripts
  for select to authenticated
  using (public.is_room_participant(room_id));

drop policy if exists participants_can_view_judge_runs
  on public.debate_judge_runs;
create policy participants_can_view_judge_runs
  on public.debate_judge_runs
  for select to authenticated
  using (public.is_room_participant(room_id));

create or replace function public.set_debate_judge_consent(
  p_room_id uuid,
  p_consented boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  room public.debate_rooms%rowtype;
  consented_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select candidate.*
  into room
  from public.debate_rooms candidate
  where candidate.id = p_room_id
  for update;

  if not found or room.status not in ('ready', 'live') then
    raise exception 'Active room required';
  end if;

  if not exists (
    select 1 from public.debate_participants participant
    where participant.room_id = p_room_id
      and participant.user_id = auth.uid()
  ) then
    raise exception 'Room membership required';
  end if;

  update public.debate_participants participant
  set judge_consent_at = case when p_consented then now() else null end
  where participant.room_id = p_room_id
    and participant.user_id = auth.uid()
  returning participant.judge_consent_at into consented_at;

  if p_consented and room.judge_status = 'not_requested' then
    update public.debate_rooms candidate
    set judge_status = 'collecting', judge_error_code = null
    where candidate.id = p_room_id;
  end if;

  return consented_at;
end;
$$;

create or replace function public.settle_debate_judgement(
  p_room_id uuid,
  p_winner_speaker_order smallint,
  p_scorecard jsonb,
  p_model text,
  p_prompt_version text,
  p_transcript_hash text
)
returns table (
  winner_user_id uuid,
  speaker_one_rating_delta integer,
  speaker_two_rating_delta integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  room public.debate_rooms%rowtype;
  speaker_one_id uuid;
  speaker_two_id uuid;
  speaker_one_profile public.competitor_profiles%rowtype;
  speaker_two_profile public.competitor_profiles%rowtype;
  expected_one numeric;
  expected_two numeric;
  score_one numeric;
  score_two numeric;
  k_one integer;
  k_two integer;
  delta_one integer := 0;
  delta_two integer := 0;
  after_one integer;
  after_two integer;
  resolved_winner uuid;
  processed_at timestamptz;
begin
  if p_scorecard is null or jsonb_typeof(p_scorecard) <> 'object' then
    raise exception 'Valid scorecard required';
  end if;
  if p_winner_speaker_order is not null
    and p_winner_speaker_order not in (1, 2) then
    raise exception 'Winner speaker order must be 1, 2, or null';
  end if;

  select candidate.* into room
  from public.debate_rooms candidate
  where candidate.id = p_room_id
  for update;

  if not found or room.status <> 'complete' then
    raise exception 'Completed room required';
  end if;
  if room.judge_status = 'complete' then
    return query select room.winner_user_id, 0, 0;
    return;
  end if;
  if (
    select count(*) from public.debate_participants participant
    where participant.room_id = p_room_id
      and participant.judge_consent_at is not null
  ) <> 2 then
    raise exception 'Both participants must consent to AI judging';
  end if;

  select participant.user_id into speaker_one_id
  from public.debate_participants participant
  where participant.room_id = p_room_id
    and participant.speaker_order = 1;

  select participant.user_id into speaker_two_id
  from public.debate_participants participant
  where participant.room_id = p_room_id
    and participant.speaker_order = 2;

  if speaker_one_id is null or speaker_two_id is null then
    raise exception 'Two debate participants required';
  end if;

  resolved_winner := case p_winner_speaker_order
    when 1 then speaker_one_id
    when 2 then speaker_two_id
    else null
  end;

  if room.is_rated then
    perform 1
    from public.competitor_profiles candidate
    where candidate.user_id in (speaker_one_id, speaker_two_id)
    order by candidate.user_id
    for update;

    select candidate.* into speaker_one_profile
    from public.competitor_profiles candidate
    where candidate.user_id = speaker_one_id;

    select candidate.* into speaker_two_profile
    from public.competitor_profiles candidate
    where candidate.user_id = speaker_two_id;

    if speaker_one_profile.user_id is null
      or speaker_two_profile.user_id is null then
      raise exception 'Persistent competitor profiles required for rated settlement';
    end if;

    expected_one := 1.0 / (
      1.0 + power(
        10.0,
        (speaker_two_profile.rating - speaker_one_profile.rating) / 400.0
      )
    );
    expected_two := 1.0 - expected_one;
    score_one := case p_winner_speaker_order
      when 1 then 1.0 when 2 then 0.0 else 0.5
    end;
    score_two := 1.0 - score_one;
    k_one := case when speaker_one_profile.matches_played < 5 then 32 else 24 end;
    k_two := case when speaker_two_profile.matches_played < 5 then 32 else 24 end;
    delta_one := round(k_one * (score_one - expected_one));
    delta_two := round(k_two * (score_two - expected_two));
    after_one := greatest(100, speaker_one_profile.rating + delta_one);
    after_two := greatest(100, speaker_two_profile.rating + delta_two);
    delta_one := after_one - speaker_one_profile.rating;
    delta_two := after_two - speaker_two_profile.rating;

    update public.competitor_profiles candidate
    set
      rating = after_one,
      matches_played = candidate.matches_played + 1,
      wins = candidate.wins
        + case when p_winner_speaker_order = 1 then 1 else 0 end,
      losses = candidate.losses
        + case when p_winner_speaker_order = 2 then 1 else 0 end,
      draws = candidate.draws
        + case when p_winner_speaker_order is null then 1 else 0 end,
      updated_at = now()
    where candidate.user_id = speaker_one_id;

    update public.competitor_profiles candidate
    set
      rating = after_two,
      matches_played = candidate.matches_played + 1,
      wins = candidate.wins
        + case when p_winner_speaker_order = 2 then 1 else 0 end,
      losses = candidate.losses
        + case when p_winner_speaker_order = 1 then 1 else 0 end,
      draws = candidate.draws
        + case when p_winner_speaker_order is null then 1 else 0 end,
      updated_at = now()
    where candidate.user_id = speaker_two_id;

    insert into public.rating_events (
      room_id, user_id, rating_before, rating_delta, rating_after, reason
    )
    values
      (
        p_room_id, speaker_one_id, speaker_one_profile.rating,
        delta_one, after_one, 'verdict'
      ),
      (
        p_room_id, speaker_two_id, speaker_two_profile.rating,
        delta_two, after_two, 'verdict'
      );

    processed_at := now();
  end if;

  update public.debate_rooms candidate
  set
    winner_user_id = resolved_winner,
    judge_status = 'complete',
    scorecard = p_scorecard,
    judge_model = p_model,
    judge_prompt_version = p_prompt_version,
    judge_completed_at = now(),
    judge_error_code = null,
    rating_processed_at = processed_at
  where candidate.id = p_room_id;

  update public.debate_judge_runs run
  set status = 'complete', completed_at = now(), error_code = null
  where run.room_id = p_room_id;

  return query select resolved_winner, delta_one, delta_two;
end;
$$;

create or replace function public.finish_debate_judgement_without_verdict(
  p_room_id uuid,
  p_status text,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('failed', 'no_decision') then
    raise exception 'Invalid terminal judge status';
  end if;

  update public.debate_rooms candidate
  set
    judge_status = p_status,
    judge_error_code = left(nullif(btrim(p_error_code), ''), 80),
    judge_completed_at = now()
  where candidate.id = p_room_id
    and candidate.judge_status <> 'complete';

  update public.debate_judge_runs run
  set
    status = p_status,
    error_code = left(nullif(btrim(p_error_code), ''), 80),
    completed_at = now()
  where run.room_id = p_room_id
    and run.status <> 'complete';
end;
$$;

create or replace function public.get_debate_judge_result(p_room_id uuid)
returns table (
  result_status text,
  result_scorecard jsonb,
  result_rating_delta integer,
  result_rating_after integer,
  result_rating_processed_at timestamptz,
  result_winner_user_id uuid,
  result_current_rating integer,
  result_current_matches_played integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  room public.debate_rooms%rowtype;
  rating_event public.rating_events%rowtype;
  profile public.competitor_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.debate_participants participant
    where participant.room_id = p_room_id
      and participant.user_id = auth.uid()
  ) then
    raise exception 'Room membership required';
  end if;

  select candidate.* into room
  from public.debate_rooms candidate
  where candidate.id = p_room_id;

  select event.* into rating_event
  from public.rating_events event
  where event.room_id = p_room_id
    and event.user_id = auth.uid();

  select candidate.* into profile
  from public.competitor_profiles candidate
  where candidate.user_id = auth.uid();

  return query select
    room.judge_status,
    room.scorecard,
    rating_event.rating_delta,
    rating_event.rating_after,
    room.rating_processed_at,
    room.winner_user_id,
    profile.rating,
    profile.matches_played;
end;
$$;

revoke all on function public.set_debate_judge_consent(uuid, boolean)
  from public, anon;
revoke all on function public.get_debate_judge_result(uuid)
  from public, anon;
revoke all on function public.settle_debate_judgement(
  uuid, smallint, jsonb, text, text, text
) from public, anon, authenticated;
revoke all on function public.finish_debate_judgement_without_verdict(
  uuid, text, text
) from public, anon, authenticated;

grant execute on function public.set_debate_judge_consent(uuid, boolean)
  to authenticated;
grant execute on function public.get_debate_judge_result(uuid)
  to authenticated;
grant execute on function public.settle_debate_judgement(
  uuid, smallint, jsonb, text, text, text
) to service_role;
grant execute on function public.finish_debate_judgement_without_verdict(
  uuid, text, text
) to service_role;
