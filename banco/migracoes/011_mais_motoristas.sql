-- A busca de motoristas devolvia só os 50 primeiros por horário, e os da tarde e da noite nunca apareciam.
-- O app já filtra por distância no navegador, então a lista pode ser maior. Mesma função da 008, só com outro limite.
create or replace function public.match_daily_rides(p_dias smallint[]) returns table (
  id uuid, motorista text, origem text, destino text, from_lat double precision, from_lng double precision,
  to_lat double precision, to_lng double precision, hora text, dias smallint[], vagas_livres integer, ride_id uuid, veiculo text
)
language sql stable security definer set search_path = '' as $$
  select d.id, p.apelido, d.origem, d.destino, d.from_lat, d.from_lng, d.to_lat, d.to_lng, d.ida_hora, d.dias,
         d.vagas - (select count(*)::integer from public.carpool_requests q where q.driver_route_id = d.id and q.status = 'aceita'),
         null::uuid,
         case when c.tipo = 'moto' then 'Moto · ' else 'Carro · ' end || c.marca || ' ' || c.modelo
  from public.daily_routes d
  join public.profiles p on p.id = d.user_id
  join public.user_cars c on c.id = d.car_id
  where auth.uid() is not null and d.user_id <> auth.uid() and d.papel = 'motorista' and d.dias && p_dias
  order by d.ida_hora
  limit 300;
$$;
