                                                                                 
                                                       
alter table public.user_cars
  add column tipo text not null default 'carro' check (tipo in ('carro', 'moto'));

alter table public.user_cars drop constraint user_cars_check;
alter table public.user_cars add constraint user_cars_check check (
  (tipo = 'moto' and combustivel = 'gasolina')
  or (tipo = 'carro' and (
    (combustivel = 'gasolina' and km_l_gasolina is not null)
    or (combustivel = 'etanol' and km_l_etanol is not null)
    or (combustivel = 'diesel' and km_l_diesel is not null)
    or (combustivel = 'flex' and km_l_gasolina is not null and km_l_etanol is not null)
    or (combustivel = 'eletrico' and kwh_km is not null)
  ))
);

grant insert (tipo), update (tipo) on public.user_cars to authenticated;

create or replace function public.user_cars_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.user_cars where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 veículos por pessoa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.save_daily_route(
  p_origem text, p_destino text, p_from_lat double precision, p_from_lng double precision,
  p_to_lat double precision, p_to_lng double precision, p_ida text, p_volta text, p_dias smallint[],
  p_oferece boolean, p_car uuid, p_vagas integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_tipo text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para salvar o trajeto.' using errcode = '28000'; end if;
  if (select count(*) from public.daily_routes where user_id = auth.uid()) >= 10 then
    raise exception 'Limite de 10 trajetos.' using errcode = 'P0001';
  end if;
  if p_oferece then
    if p_car is null or p_vagas is null then raise exception 'Escolha o veículo e as vagas.' using errcode = 'P0001'; end if;
    select tipo into v_tipo from public.user_cars where id = p_car and user_id = auth.uid();
    if not found then raise exception 'Escolha um dos seus veículos.' using errcode = 'P0001'; end if;
    if p_vagas < 1 or p_vagas > (case when v_tipo = 'moto' then 1 else 6 end) then
      raise exception 'Confira o número de vagas para este veículo.' using errcode = 'P0001';
    end if;
    if (select telefone from public.profiles where id = auth.uid()) is null then
      raise exception 'Cadastre seu telefone no perfil para oferecer carona.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.daily_routes (user_id, origem, destino, from_lat, from_lng, to_lat, to_lng, ida_hora, volta_hora, dias, oferece_carona, car_id, vagas, papel)
  values (auth.uid(), trim(p_origem), trim(p_destino), p_from_lat, p_from_lng, p_to_lat, p_to_lng, p_ida, p_volta, p_dias, p_oferece,
          case when p_oferece then p_car end, case when p_oferece then p_vagas end, case when p_oferece then 'motorista' else 'passageiro' end)
  returning id into v_id;
  return v_id;
end;
$$;

drop function public.match_daily_rides(smallint[]);
create function public.match_daily_rides(p_dias smallint[]) returns table (
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
  limit 50;
$$;
revoke execute on function public.match_daily_rides(smallint[]) from public, anon;
grant execute on function public.match_daily_rides(smallint[]) to authenticated;

create or replace function public.my_carpool_requests() returns table (
  id uuid, papel text, status text, mensagem text, created_at timestamptz, outro text,
  driver_route jsonb, passenger_route jsonb, vagas integer, telefone text, placa text, car_label text
)
language sql stable security definer set search_path = '' as $$
  select q.id,
         case when q.driver_id = auth.uid() then 'motorista' else 'passageiro' end,
         q.status, q.mensagem, q.created_at,
         case when q.driver_id = auth.uid() then pp.apelido else dp.apelido end,
         jsonb_build_object('id', d.id, 'origem', d.origem, 'destino', d.destino, 'from_lat', d.from_lat, 'from_lng', d.from_lng,
                            'to_lat', d.to_lat, 'to_lng', d.to_lng, 'hora', d.ida_hora, 'volta', d.volta_hora, 'dias', d.dias),
         jsonb_build_object('id', p.id, 'origem', p.origem, 'destino', p.destino, 'from_lat', p.from_lat, 'from_lng', p.from_lng,
                            'to_lat', p.to_lat, 'to_lng', p.to_lng, 'hora', p.ida_hora, 'volta', p.volta_hora, 'dias', p.dias),
         d.vagas,
         case when q.status = 'aceita' then (case when q.driver_id = auth.uid() then pp.telefone else dp.telefone end) end,
         case when q.status = 'aceita' and q.passenger_id = auth.uid() then c.placa end,
         case when q.passenger_id = auth.uid() then
           case when c.tipo = 'moto' then 'Moto ' else 'Carro ' end || c.marca || ' ' || c.modelo || ' ' || c.ano
         end
  from public.carpool_requests q
  join public.daily_routes d on d.id = q.driver_route_id
  join public.daily_routes p on p.id = q.passenger_route_id
  join public.profiles dp on dp.id = q.driver_id
  join public.profiles pp on pp.id = q.passenger_id
  left join public.user_cars c on c.id = d.car_id
  where auth.uid() is not null and (q.driver_id = auth.uid() or q.passenger_id = auth.uid())
  order by q.created_at desc
  limit 100;
$$;

revoke execute on function public.my_carpool_requests() from public, anon;
grant execute on function public.my_carpool_requests() to authenticated;
