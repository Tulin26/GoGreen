                                                                                                         
                                                                                                        
                                                                                               
create table public.daily_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  origem text not null check (char_length(origem) between 2 and 80),
  destino text not null check (char_length(destino) between 2 and 80),
  from_lat double precision not null check (from_lat between -90 and 90),
  from_lng double precision not null check (from_lng between -180 and 180),
  to_lat double precision not null check (to_lat between -90 and 90),
  to_lng double precision not null check (to_lng between -180 and 180),
  ida_hora text not null check (ida_hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  volta_hora text check (volta_hora is null or volta_hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  dias smallint[] not null check (cardinality(dias) between 1 and 7 and dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  oferece_carona boolean not null default false,
  car_id uuid references public.user_cars (id) on delete set null,
  vagas integer check (vagas is null or vagas between 1 and 6),
  ride_id uuid references public.rides (id) on delete set null,
  created_at timestamptz not null default now(),
  check (not oferece_carona or (car_id is not null and vagas is not null))
);
create index daily_routes_user_idx on public.daily_routes (user_id);
create index daily_routes_car_idx on public.daily_routes (car_id);
create index daily_routes_ride_idx on public.daily_routes (ride_id);
alter table public.daily_routes enable row level security;
revoke all on public.daily_routes from anon, authenticated;

create function public.save_daily_route(
  p_origem text, p_destino text, p_from_lat double precision, p_from_lng double precision,
  p_to_lat double precision, p_to_lng double precision, p_ida text, p_volta text, p_dias smallint[],
  p_oferece boolean, p_car uuid, p_vagas integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ride uuid;
  v_saida timestamptz;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para salvar o trajeto.' using errcode = '28000'; end if;
  if (select count(*) from public.daily_routes where user_id = auth.uid()) >= 10 then
    raise exception 'Limite de 10 trajetos.' using errcode = 'P0001';
  end if;
  if p_oferece then
                                                                                
    v_saida := ((now() at time zone 'America/Sao_Paulo')::date + p_ida::time) at time zone 'America/Sao_Paulo';
    if v_saida <= now() then v_saida := v_saida + interval '1 day'; end if;
    v_ride := public.offer_ride(p_car, p_origem, p_destino, v_saida, p_vagas, 'Trajeto diário');
  end if;
  insert into public.daily_routes (user_id, origem, destino, from_lat, from_lng, to_lat, to_lng, ida_hora, volta_hora, dias, oferece_carona, car_id, vagas, ride_id)
  values (auth.uid(), trim(p_origem), trim(p_destino), p_from_lat, p_from_lng, p_to_lat, p_to_lng, p_ida, p_volta, p_dias, p_oferece, case when p_oferece then p_car end, case when p_oferece then p_vagas end, v_ride)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.my_daily_routes() returns table (
  id uuid, origem text, destino text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision,
  ida_hora text, volta_hora text, dias smallint[], oferece_carona boolean, car_id uuid, vagas integer, ride_id uuid
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.origem, d.destino, d.from_lat, d.from_lng, d.to_lat, d.to_lng, d.ida_hora, d.volta_hora, d.dias, d.oferece_carona, d.car_id, d.vagas, d.ride_id
  from public.daily_routes d
  where d.user_id = auth.uid()
  order by d.created_at;
$$;

create function public.delete_daily_route(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_ride uuid;
begin
  delete from public.daily_routes where id = p_id and user_id = auth.uid() returning ride_id into v_ride;
  if not found then raise exception 'Trajeto não encontrado.' using errcode = 'P0002'; end if;
  if v_ride is not null then update public.rides set status = 'cancelada' where id = v_ride and driver_id = auth.uid(); end if;
end;
$$;

                                                                                      
create function public.match_daily_rides(p_dias smallint[]) returns table (
  id uuid, motorista text, origem text, destino text, from_lat double precision, from_lng double precision,
  to_lat double precision, to_lng double precision, hora text, dias smallint[], vagas_livres integer, ride_id uuid
)
language sql stable security definer set search_path = '' as $$
  select d.id, p.apelido, d.origem, d.destino, d.from_lat, d.from_lng, d.to_lat, d.to_lng, d.ida_hora, d.dias,
         d.vagas - (select count(*)::integer from public.ride_requests a where a.ride_id = d.ride_id and a.status = 'aceita'),
         d.ride_id
  from public.daily_routes d
  join public.profiles p on p.id = d.user_id
  join public.rides r on r.id = d.ride_id
  where auth.uid() is not null and d.user_id <> auth.uid() and d.oferece_carona and d.dias && p_dias
    and r.status = 'aberta' and r.saida_em > now()
  order by d.ida_hora
  limit 50;
$$;

revoke execute on function public.save_daily_route(text, text, double precision, double precision, double precision, double precision, text, text, smallint[], boolean, uuid, integer) from public, anon;
revoke execute on function public.my_daily_routes() from public, anon;
revoke execute on function public.delete_daily_route(uuid) from public, anon;
revoke execute on function public.match_daily_rides(smallint[]) from public, anon;
grant execute on function public.save_daily_route(text, text, double precision, double precision, double precision, double precision, text, text, smallint[], boolean, uuid, integer) to authenticated;
grant execute on function public.my_daily_routes() to authenticated;
grant execute on function public.delete_daily_route(uuid) to authenticated;
grant execute on function public.match_daily_rides(smallint[]) to authenticated;
