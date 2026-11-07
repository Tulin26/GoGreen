-- Visitantes sem conta podem ver as caronas. Para eles, o número da casa some do endereço e as coordenadas são
-- arredondadas (cerca de 100 m); quem está logado continua vendo o trajeto completo. Telefone e placa nunca saem daqui.
create or replace function public.match_daily_rides(p_dias smallint[]) returns table (
  id uuid, motorista text, origem text, destino text, from_lat double precision, from_lng double precision,
  to_lat double precision, to_lng double precision, hora text, dias smallint[], vagas_livres integer, ride_id uuid, veiculo text
)
language sql stable security definer set search_path = '' as $$
  select d.id, p.apelido,
         case when auth.uid() is null then regexp_replace(d.origem, ',\s*[0-9]+[A-Za-z]?\s*(?=,|$)', '', 'g') else d.origem end,
         case when auth.uid() is null then regexp_replace(d.destino, ',\s*[0-9]+[A-Za-z]?\s*(?=,|$)', '', 'g') else d.destino end,
         case when auth.uid() is null then round(d.from_lat::numeric, 3)::double precision else d.from_lat end,
         case when auth.uid() is null then round(d.from_lng::numeric, 3)::double precision else d.from_lng end,
         case when auth.uid() is null then round(d.to_lat::numeric, 3)::double precision else d.to_lat end,
         case when auth.uid() is null then round(d.to_lng::numeric, 3)::double precision else d.to_lng end,
         d.ida_hora, d.dias,
         d.vagas - (select count(*)::integer from public.carpool_requests q where q.driver_route_id = d.id and q.status = 'aceita'),
         null::uuid,
         case when c.tipo = 'moto' then 'Moto · ' else 'Carro · ' end || c.marca || ' ' || c.modelo
  from public.daily_routes d
  join public.profiles p on p.id = d.user_id
  join public.user_cars c on c.id = d.car_id
  where (auth.uid() is null or d.user_id <> auth.uid()) and d.papel = 'motorista' and d.dias && p_dias
  order by d.ida_hora
  limit 300;
$$;

grant execute on function public.match_daily_rides(smallint[]) to anon;
