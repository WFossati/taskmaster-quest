DROP FUNCTION IF EXISTS public.get_reward_wallet_summary();

CREATE OR REPLACE FUNCTION public.get_reward_wallet_summary()
 RETURNS TABLE(total_earned_xp integer, net_xp integer, converted_xp integer, available_xp integer, coin_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_earned integer;
  v_converted integer;
  v_penalties integer;
  v_coins integer;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  select coalesce((select sum(xp_reward) from public.tasks where user_id=v_user and status='Concluída'),0)
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

CREATE OR REPLACE FUNCTION public.convert_xp_to_coins(p_coins integer)
 RETURNS TABLE(available_xp integer, coin_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_needed := p_coins * 1000;
  select coalesce((select sum(xp_reward) from public.tasks where user_id=v_user and status='Concluída'),0)
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