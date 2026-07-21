-- New judge runs use Gemini. Existing run metadata remains unchanged so its
-- recorded provider continues to describe the provider that actually ran it.

alter table public.debate_judge_runs
  alter column provider set default 'gemini';
