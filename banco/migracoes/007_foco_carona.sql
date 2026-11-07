                                                                                                                  
                                                                                                                            
                                                                                                            

alter table public.daily_routes add column papel text not null default 'passageiro' check (papel in ('motorista', 'passageiro'));
update public.daily_routes set papel = 'motorista' where oferece_carona;
create index daily_routes_papel_idx on public.daily_routes (papel);

                                                                                   
drop function public.my_daily_routes();
create function public.my_daily_routes() returns table (
  id uuid, origem text, destino text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision,
  ida_hora text, volta_hora text, dias smallint[], oferece_carona boolean, car_id uuid, vagas integer, ride_id uuid, papel text
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.origem, d.destino, d.from_lat, d.from_lng, d.to_lat, d.to_lng, d.ida_hora, d.volta_hora, d.dias, d.oferece_carona, d.car_id, d.vagas, d.ride_id, d.papel
  from public.daily_routes d
  where d.user_id = auth.uid()
  order by d.created_at;
$$;
revoke execute on function public.my_daily_routes() from public, anon;
grant execute on function public.my_daily_routes() to authenticated;

                                                                                                                    
create or replace function public.save_daily_route(
  p_origem text, p_destino text, p_from_lat double precision, p_from_lng double precision,
  p_to_lat double precision, p_to_lng double precision, p_ida text, p_volta text, p_dias smallint[],
  p_oferece boolean, p_car uuid, p_vagas integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para salvar o trajeto.' using errcode = '28000'; end if;
  if (select count(*) from public.daily_routes where user_id = auth.uid()) >= 10 then
    raise exception 'Limite de 10 trajetos.' using errcode = 'P0001';
  end if;
  if p_oferece then
    if p_car is null or p_vagas is null then raise exception 'Escolha o carro e as vagas.' using errcode = 'P0001'; end if;
    if not exists (select 1 from public.user_cars where id = p_car and user_id = auth.uid()) then
      raise exception 'Escolha um dos seus carros.' using errcode = 'P0001';
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

                                                                              
                         
                                                                              
create table public.carpool_requests (
  id uuid primary key default gen_random_uuid(),
  driver_route_id uuid not null references public.daily_routes (id) on delete cascade,
  passenger_route_id uuid not null references public.daily_routes (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  mensagem text check (mensagem is null or char_length(mensagem) <= 200),
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at timestamptz not null default now(),
  unique (driver_route_id, passenger_route_id)
);
create index carpool_requests_driver_route_idx on public.carpool_requests (driver_route_id, status);
create index carpool_requests_passenger_route_idx on public.carpool_requests (passenger_route_id);
create index carpool_requests_driver_idx on public.carpool_requests (driver_id);
create index carpool_requests_passenger_idx on public.carpool_requests (passenger_id);
alter table public.carpool_requests enable row level security;
revoke all on public.carpool_requests from anon, authenticated;

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.carpool_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index request_messages_thread_idx on public.request_messages (request_id, created_at);
create index request_messages_sender_idx on public.request_messages (sender_id);
alter table public.request_messages enable row level security;
revoke all on public.request_messages from anon, authenticated;

                                                                                                                                   
create or replace function public.match_daily_rides(p_dias smallint[]) returns table (
  id uuid, motorista text, origem text, destino text, from_lat double precision, from_lng double precision,
  to_lat double precision, to_lng double precision, hora text, dias smallint[], vagas_livres integer, ride_id uuid
)
language sql stable security definer set search_path = '' as $$
  select d.id, p.apelido, d.origem, d.destino, d.from_lat, d.from_lng, d.to_lat, d.to_lng, d.ida_hora, d.dias,
         d.vagas - (select count(*)::integer from public.carpool_requests q where q.driver_route_id = d.id and q.status = 'aceita'),
         null::uuid
  from public.daily_routes d
  join public.profiles p on p.id = d.user_id
  where auth.uid() is not null and d.user_id <> auth.uid() and d.papel = 'motorista' and d.dias && p_dias
  order by d.ida_hora
  limit 50;
$$;

create function public.request_carpool(p_driver_route uuid, p_passenger_route uuid, p_mensagem text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.daily_routes%rowtype;
  v_d public.daily_routes%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para pedir carona.' using errcode = '28000'; end if;
  select * into v_p from public.daily_routes where id = p_passenger_route and user_id = auth.uid();
  if not found then raise exception 'Escolha uma das suas rotas.' using errcode = 'P0001'; end if;
  select * into v_d from public.daily_routes where id = p_driver_route and papel = 'motorista';
  if not found then raise exception 'Esta rota não é de um motorista.' using errcode = 'P0001'; end if;
  if v_d.user_id = auth.uid() then raise exception 'Esta é a sua própria rota de motorista.' using errcode = 'P0001'; end if;
  if (select telefone from public.profiles where id = auth.uid()) is null then
    raise exception 'Cadastre seu telefone no perfil para pedir carona.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.carpool_requests where driver_route_id = v_d.id and status = 'aceita') >= v_d.vagas then
    raise exception 'Esta rota não tem mais vagas.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.carpool_requests where passenger_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Limite de 20 pedidos por dia atingido.' using errcode = 'P0001';
  end if;
  begin
    insert into public.carpool_requests (driver_route_id, passenger_route_id, driver_id, passenger_id, mensagem)
    values (v_d.id, v_p.id, v_d.user_id, auth.uid(), nullif(trim(coalesce(p_mensagem, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Você já pediu carona nesta rota.' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

                                                                                                   
create function public.my_carpool_requests() returns table (
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
         case when q.passenger_id = auth.uid() then c.marca || ' ' || c.modelo || ' ' || c.ano end
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

create function public.respond_carpool_request(p_request uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_q public.carpool_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  select * into v_q from public.carpool_requests where id = p_request and driver_id = auth.uid();
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_q.status <> 'pendente' then raise exception 'Este pedido já foi respondido.' using errcode = 'P0001'; end if;
  if p_aceitar and (select count(*) from public.carpool_requests where driver_route_id = v_q.driver_route_id and status = 'aceita')
     >= (select vagas from public.daily_routes where id = v_q.driver_route_id) then
    raise exception 'Não há mais vagas nesta rota.' using errcode = 'P0001';
  end if;
  update public.carpool_requests set status = case when p_aceitar then 'aceita' else 'recusada' end where id = p_request;
end;
$$;

create function public.cancel_carpool_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '28000'; end if;
  update public.carpool_requests set status = 'cancelada'
  where id = p_request and passenger_id = auth.uid() and status in ('pendente', 'aceita');
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
end;
$$;

                                                                              
                                                                     
                                                                              
create function public.send_request_message(p_request uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_q public.carpool_requests%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para conversar.' using errcode = '28000'; end if;
  select * into v_q from public.carpool_requests where id = p_request and (driver_id = auth.uid() or passenger_id = auth.uid());
  if not found then raise exception 'Conversa não encontrada.' using errcode = 'P0002'; end if;
  if v_q.status in ('recusada', 'cancelada') then raise exception 'Esta conversa foi encerrada (pedido recusado ou cancelado).' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Escreva uma mensagem.' using errcode = 'P0001'; end if;
  if char_length(p_body) > 500 then raise exception 'Mensagem longa demais (máximo 500 letras).' using errcode = 'P0001'; end if;
  if (select count(*) from public.request_messages where sender_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Muitas mensagens em pouco tempo. Tente daqui a pouco.' using errcode = 'P0001';
  end if;
  insert into public.request_messages (request_id, sender_id, body) values (p_request, auth.uid(), trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

create function public.list_request_messages(p_request uuid) returns table (
  id uuid, mine boolean, autor text, body text, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para conversar.' using errcode = '28000'; end if;
  if not exists (select 1 from public.carpool_requests q where q.id = p_request and (q.driver_id = auth.uid() or q.passenger_id = auth.uid())) then
    raise exception 'Conversa não encontrada.' using errcode = 'P0002';
  end if;
  return query
    select m.id, m.sender_id = auth.uid(), p.apelido, m.body, m.created_at
    from public.request_messages m
    join public.profiles p on p.id = m.sender_id
    where m.request_id = p_request
    order by m.created_at, m.id
    limit 200;
end;
$$;

revoke execute on function public.request_carpool(uuid, uuid, text) from public, anon;
revoke execute on function public.my_carpool_requests() from public, anon;
revoke execute on function public.respond_carpool_request(uuid, boolean) from public, anon;
revoke execute on function public.cancel_carpool_request(uuid) from public, anon;
revoke execute on function public.send_request_message(uuid, text) from public, anon;
revoke execute on function public.list_request_messages(uuid) from public, anon;
grant execute on function public.request_carpool(uuid, uuid, text) to authenticated;
grant execute on function public.my_carpool_requests() to authenticated;
grant execute on function public.respond_carpool_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_carpool_request(uuid) to authenticated;
grant execute on function public.send_request_message(uuid, text) to authenticated;
grant execute on function public.list_request_messages(uuid) to authenticated;
