-- Vamo Dale!! — engajamento (28/10/2026)
-- 1) Economia: 100 XP = 1 moeda (antes 1.000).
-- 2) Gaveta "Algum dia": tasks.someday_at (missão escondida, sem apagar nada).
-- 3) Combo do dia: tasks.xp_bonus guarda o bônus ganho na conclusão (1,2× na 2ª, 1,5× da 3ª em diante).
-- 4) Missões do antigo Study Hub (descrição com prefixo [STUDY_HUB_V1]) deixam de contar
--    nas métricas semanais deste app; os dados continuam no banco.
-- Idempotente: pode ser executada mais de uma vez.

alter table public.tasks add column if not exists xp_bonus integer not null default 0;
alter table public.tasks add column if not exists someday_at timestamptz;
alter table public.tasks drop constraint if exists tasks_xp_bonus_check;
alter table public.tasks add constraint tasks_xp_bonus_check check (xp_bonus >= 0);

-- Conclusão com combo. SECURITY INVOKER: a RLS de tasks continua valendo.
create or replace function public.complete_task(p_task_id uuid, p_tz text default 'America/Sao_Paulo')
returns table(base_xp integer, bonus_xp integer, multiplier numeric, combo integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_today date;
  v_before integer;
  v_mult numeric;
  v_bonus integer;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_task from public.tasks where id = p_task_id and user_id = v_user for update;
  if not found then raise exception 'Missão não encontrada'; end if;

  v_today := (now() at time zone p_tz)::date;

  if v_task.status = 'Concluída' then
    base_xp := v_task.xp_reward; bonus_xp := v_task.xp_bonus; multiplier := 1; combo := 0;
    return next; return;
  end if;

  select count(*)::int into v_before from public.tasks
   where user_id = v_user and status = 'Concluída' and completed_at is not null
     and (completed_at at time zone p_tz)::date = v_today;

  v_mult := case when v_before >= 2 then 1.5 when v_before = 1 then 1.2 else 1 end;
  v_bonus := round(v_task.xp_reward * (v_mult - 1))::int;

  update public.tasks
     set status = 'Concluída', completed_at = now(), xp_bonus = v_bonus, someday_at = null
   where id = p_task_id;

  base_xp := v_task.xp_reward; bonus_xp := v_bonus; multiplier := v_mult; combo := v_before + 1;
  return next;
end;
$$;
revoke execute on function public.complete_task(uuid, text) from anon;
grant execute on function public.complete_task(uuid, text) to authenticated;

create or replace function public.get_reward_wallet_summary()
returns table(total_earned_xp integer, net_xp integer, converted_xp integer, available_xp integer, coin_balance integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_earned integer;
  v_converted integer;
  v_penalties integer;
  v_coins integer;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  select coalesce((select sum(xp_reward + xp_bonus) from public.tasks where user_id=v_user and status='Concluída'),0)
       + coalesce((select sum(xp_earned) from public.habit_completions where user_id=v_user),0)
  into v_earned;
  select coalesce(sum(xp_amount),0) into v_converted from public.reward_transactions where user_id=v_user and transaction_type='xp_conversion';
  select coalesce(sum(xp_lost),0) into v_penalties from public.demerit_occurrences where user_id=v_user;
  select coalesce(sum(coin_amount),0) into v_coins from public.reward_transactions where user_id=v_user;
  total_earned_xp := v_earned;
  net_xp := greatest(v_earned - v_penalties, 0);
  converted_xp := v_converted;
  available_xp := greatest(v_earned - v_penalties - v_converted, 0);
  coin_balance := v_coins;
  return next;
end;
$function$;

create or replace function public.convert_xp_to_coins(p_coins integer)
returns table(available_xp integer, coin_balance integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_earned integer;
  v_converted integer;
  v_penalties integer;
  v_available integer;
  v_needed integer;
  v_balance integer;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if p_coins is null or p_coins <= 0 then raise exception 'Quantidade de moedas inválida'; end if;
  -- Serializa conversões da mesma usuária (evita converter o mesmo XP duas vezes).
  perform pg_advisory_xact_lock(hashtext('convert_xp_to_coins:' || v_user::text));
  v_needed := p_coins * 100;
  select coalesce((select sum(xp_reward + xp_bonus) from public.tasks where user_id=v_user and status='Concluída'),0)
       + coalesce((select sum(xp_earned) from public.habit_completions where user_id=v_user),0)
  into v_earned;
  select coalesce(sum(xp_amount),0) into v_converted from public.reward_transactions where user_id=v_user and transaction_type='xp_conversion';
  select coalesce(sum(xp_lost),0) into v_penalties from public.demerit_occurrences where user_id=v_user;
  v_available := greatest(v_earned - v_penalties - v_converted, 0);
  if v_available < v_needed then raise exception 'XP líquido disponível insuficiente'; end if;
  insert into public.reward_transactions(user_id, transaction_type, xp_amount, coin_amount)
  values (v_user, 'xp_conversion', v_needed, p_coins);
  select coalesce(sum(coin_amount),0) into v_balance from public.reward_transactions where user_id=v_user;
  available_xp := v_available - v_needed;
  coin_balance := v_balance;
  return next;
end;
$function$;

create or replace function public.get_weekly_review_metrics(p_week_start date)
returns table(week_start date, week_end date, xp_gained integer, xp_lost integer, tasks_completed integer, habits_completed integer, overdue_tasks integer, planned_minutes integer, top_area text, neglected_area text, pending_tasks integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_end date := p_week_start + 6;
  v_top text;
  v_low text;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;

  with areas(area) as (
    values ('fejers'),('gera'),('ufrgs'),('saude'),('conhecimento'),('financeiro')
  ), activity as (
    select a.area,
      coalesce((select count(*) from public.tasks t where t.user_id=v_user and t.area=a.area and t.completed_at::date between p_week_start and v_end),0)
      + coalesce((select count(*) from public.habit_completions hc join public.habits h on h.id=hc.habit_id where hc.user_id=v_user and h.area=a.area and hc.completed_on between p_week_start and v_end),0) score
    from areas a
  )
  select (select area from activity order by score desc, area limit 1),
         (select area from activity order by score asc, area limit 1)
  into v_top, v_low;

  return query
  select p_week_start,
         v_end,
         coalesce((select sum(t.xp_reward + t.xp_bonus)::int from public.tasks t where t.user_id=v_user and t.completed_at::date between p_week_start and v_end),0)
         + coalesce((select sum(hc.xp_earned)::int from public.habit_completions hc where hc.user_id=v_user and hc.completed_on between p_week_start and v_end),0),
         coalesce((select sum(d.xp_lost)::int from public.demerit_occurrences d where d.user_id=v_user and d.occurred_on between p_week_start and v_end),0),
         coalesce((select count(*)::int from public.tasks t where t.user_id=v_user and t.completed_at::date between p_week_start and v_end),0),
         coalesce((select count(*)::int from public.habit_completions hc where hc.user_id=v_user and hc.completed_on between p_week_start and v_end),0),
         coalesce((select count(*)::int from public.tasks t where t.user_id=v_user and t.someday_at is null and coalesce(t.description,'') not like '[STUDY_HUB_V1]%' and t.created_at::date <= v_end and t.due_date <= v_end and (t.completed_at is null or t.completed_at::date > v_end)),0),
         coalesce((select sum(coalesce(t.duration_minutes,0))::int from public.tasks t where t.user_id=v_user and t.someday_at is null and coalesce(t.description,'') not like '[STUDY_HUB_V1]%' and t.due_date between p_week_start and v_end),0),
         v_top,
         v_low,
         coalesce((select count(*)::int from public.tasks t where t.user_id=v_user and t.someday_at is null and coalesce(t.description,'') not like '[STUDY_HUB_V1]%' and t.created_at::date <= v_end and t.due_date <= v_end and (t.completed_at is null or t.completed_at::date > v_end)),0);
end;
$function$;

create or replace function public.get_weekly_review_pending_tasks(p_week_start date)
returns table(id uuid, title text, due_date date, area text)
language sql
security definer
set search_path to 'public'
as $function$
  select t.id,t.title,t.due_date,t.area
  from public.tasks t
  where t.user_id=auth.uid()
    and t.someday_at is null
    and coalesce(t.description,'') not like '[STUDY_HUB_V1]%'
    and t.created_at::date <= p_week_start + 6
    and t.due_date <= p_week_start + 6
    and (t.completed_at is null or t.completed_at::date > p_week_start + 6)
  order by t.due_date nulls last, t.title
  limit 12;
$function$;

create or replace function public.get_weekly_dashboard_metrics(p_week_start date)
returns table(week_start date, week_end date, planned_tasks integer, completed_planned_tasks integer, execution_rate numeric, habit_target integer, habit_completion_rate numeric, demerit_occurrences integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid := auth.uid(); v_end date := p_week_start + 6; v_planned integer; v_done integer; v_habit_target integer; v_habit_done integer;
begin
 if v_user is null then raise exception 'Usuário não autenticado'; end if;
 select count(*)::int, count(*) filter (where t.completed_at is not null and t.completed_at::date <= v_end)::int into v_planned,v_done
   from public.tasks t
  where t.user_id=v_user and t.due_date between p_week_start and v_end and t.created_at::date <= v_end
    and (t.someday_at is null or t.completed_at is not null)
    and coalesce(t.description,'') not like '[STUDY_HUB_V1]%';
 select coalesce(sum(h.target_per_week),0)::int into v_habit_target from public.habits h where h.user_id=v_user and h.is_active=true;
 select count(*)::int into v_habit_done from public.habit_completions hc where hc.user_id=v_user and hc.completed_on between p_week_start and v_end;
 return query select p_week_start,v_end,v_planned,v_done,case when v_planned=0 then 0 else round((v_done::numeric/v_planned)*100,1) end,v_habit_target,case when v_habit_target=0 then 0 else round((least(v_habit_done,v_habit_target)::numeric/v_habit_target)*100,1) end,coalesce((select count(*)::int from public.demerit_occurrences d where d.user_id=v_user and d.occurred_on between p_week_start and v_end),0);
end; $function$;
