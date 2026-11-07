                                                                    

                                                                              
                               
                                                                              
drop function public.my_points();
drop function public.ranking_turmas();
drop function public.points_by_user();
alter table public.profiles drop column turma;

                                                                             
alter table public.profiles
  add column telefone text check (telefone is null or telefone ~ '^[0-9]{10,13}$');
grant update (telefone) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_telefone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '[^0-9]', '', 'g');
begin
                                                                                                   
  if v_telefone !~ '^[0-9]{10,13}$' then v_telefone := null; end if;
  insert into public.profiles (id, apelido, telefone)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'apelido'), 40), ''), 'Morador'),
    v_telefone
  );
  return new;
end;
$$;

                                                                              
                                                      
                                                                              
create table public.user_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  marca text not null check (char_length(marca) between 1 and 40),
  modelo text not null check (char_length(modelo) between 1 and 60),
  versao text check (versao is null or char_length(versao) <= 60),
  ano integer not null check (ano between 1950 and 2100),
  placa text not null check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  combustivel text not null check (combustivel in ('gasolina', 'etanol', 'flex', 'diesel')),
  km_l_gasolina numeric(5, 2) check (km_l_gasolina is null or km_l_gasolina between 1 and 80),
  km_l_etanol numeric(5, 2) check (km_l_etanol is null or km_l_etanol between 1 and 80),
  km_l_diesel numeric(5, 2) check (km_l_diesel is null or km_l_diesel between 1 and 80),
  co2_g_km_gasolina numeric(6, 1),
  co2_g_km_etanol numeric(6, 1),
  co2_g_km_diesel numeric(6, 1),
  origem_consumo text not null default 'manual' check (origem_consumo in ('inmetro', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, placa),
  check (
    (combustivel = 'gasolina' and km_l_gasolina is not null)
    or (combustivel = 'etanol' and km_l_etanol is not null)
    or (combustivel = 'diesel' and km_l_diesel is not null)
    or (combustivel = 'flex' and km_l_gasolina is not null and km_l_etanol is not null)
  )
);
create index user_cars_user_idx on public.user_cars (user_id);

alter table public.user_cars enable row level security;
create policy "cada pessoa vê os próprios carros" on public.user_cars
  for select to authenticated using (user_id = auth.uid());
create policy "cada pessoa cadastra o próprio carro" on public.user_cars
  for insert to authenticated with check (user_id = auth.uid());
create policy "cada pessoa edita o próprio carro" on public.user_cars
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cada pessoa apaga o próprio carro" on public.user_cars
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.user_cars from anon, authenticated;
grant select, delete on public.user_cars to authenticated;
grant insert (marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel,
              co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, origem_consumo) on public.user_cars to authenticated;
grant update (marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel,
              co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, origem_consumo) on public.user_cars to authenticated;

create function public.user_cars_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.user_cars where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 carros por pessoa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.user_cars_limit() from public, anon, authenticated;
create trigger user_cars_limit before insert on public.user_cars
  for each row execute function public.user_cars_limit();

                                                                              
                                                                       
                                                              
                                                                              
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  car_id uuid references public.user_cars (id) on delete set null,
  car_label text not null,
  origem text not null check (char_length(origem) between 2 and 80),
  destino text not null check (char_length(destino) between 2 and 80),
  saida_em timestamptz not null,
  vagas integer not null check (vagas between 1 and 6),
  observacao text check (observacao is null or char_length(observacao) <= 200),
  status text not null default 'aberta' check (status in ('aberta', 'cancelada')),
  created_at timestamptz not null default now()
);
create index rides_saida_idx on public.rides (status, saida_em);
create index rides_driver_idx on public.rides (driver_id);
create index rides_car_idx on public.rides (car_id);
alter table public.rides enable row level security;
revoke all on public.rides from anon, authenticated;

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  mensagem text check (mensagem is null or char_length(mensagem) <= 200),
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at timestamptz not null default now(),
  unique (ride_id, passenger_id)
);
create index ride_requests_passenger_idx on public.ride_requests (passenger_id);
alter table public.ride_requests enable row level security;
revoke all on public.ride_requests from anon, authenticated;

create function public.offer_ride(p_car uuid, p_origem text, p_destino text, p_saida timestamptz, p_vagas integer, p_observacao text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_car public.user_cars%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para oferecer carona.' using errcode = '28000'; end if;
  select * into v_car from public.user_cars where id = p_car and user_id = auth.uid();
  if not found then raise exception 'Escolha um dos seus carros.' using errcode = 'P0001'; end if;
  if (select telefone from public.profiles where id = auth.uid()) is null then
    raise exception 'Cadastre seu telefone no perfil para oferecer carona.' using errcode = 'P0001';
  end if;
  if p_saida < now() then raise exception 'Escolha um horário no futuro.' using errcode = 'P0001'; end if;
  if (select count(*) from public.rides where driver_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Limite de 10 caronas por dia atingido.' using errcode = 'P0001';
  end if;
  insert into public.rides (driver_id, car_id, car_label, origem, destino, saida_em, vagas, observacao)
  values (auth.uid(), p_car, v_car.marca || ' ' || v_car.modelo || ' ' || v_car.ano, trim(p_origem), trim(p_destino), p_saida, p_vagas, nullif(trim(p_observacao), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.cancel_ride(p_ride uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.rides set status = 'cancelada' where id = p_ride and driver_id = auth.uid();
  if not found then raise exception 'Carona não encontrada.' using errcode = 'P0002'; end if;
end;
$$;

create function public.request_ride(p_ride uuid, p_mensagem text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ride public.rides%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para pedir carona.' using errcode = '28000'; end if;
  select * into v_ride from public.rides where id = p_ride;
  if not found or v_ride.status <> 'aberta' or v_ride.saida_em < now() then
    raise exception 'Esta carona não está mais disponível.' using errcode = 'P0001';
  end if;
  if v_ride.driver_id = auth.uid() then raise exception 'Esta carona é sua.' using errcode = 'P0001'; end if;
  if (select telefone from public.profiles where id = auth.uid()) is null then
    raise exception 'Cadastre seu telefone no perfil para pedir carona.' using errcode = 'P0001';
  end if;
  insert into public.ride_requests (ride_id, passenger_id, mensagem)
  values (p_ride, auth.uid(), nullif(trim(p_mensagem), ''))
  on conflict (ride_id, passenger_id) do update
    set status = 'pendente', mensagem = excluded.mensagem
    where public.ride_requests.status = 'cancelada'
  returning id into v_id;
  if v_id is null then raise exception 'Você já pediu esta carona.' using errcode = 'P0001'; end if;
  return v_id;
end;
$$;

create function public.cancel_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.ride_requests set status = 'cancelada' where id = p_request and passenger_id = auth.uid();
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
end;
$$;

create function public.respond_request(p_request uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.ride_requests%rowtype;
  v_ride public.rides%rowtype;
begin
  select * into v_req from public.ride_requests where id = p_request;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_req.status <> 'pendente' then raise exception 'Este pedido já foi respondido.' using errcode = 'P0001'; end if;
                                                                                   
  select * into v_ride from public.rides where id = v_req.ride_id and driver_id = auth.uid() for update;
  if not found then raise exception 'Só quem oferece a carona responde.' using errcode = '42501'; end if;
  if p_aceitar and (select count(*) from public.ride_requests where ride_id = v_ride.id and status = 'aceita') >= v_ride.vagas then
    raise exception 'Não há mais vagas nesta carona.' using errcode = 'P0001';
  end if;
  update public.ride_requests set status = case when p_aceitar then 'aceita' else 'recusada' end where id = p_request;
end;
$$;

                                                                               
create function public.list_rides() returns table (
  id uuid, motorista text, car_label text, origem text, destino text, saida_em timestamptz, vagas integer,
  vagas_livres integer, observacao text, minha boolean, meu_pedido uuid, meu_status text, telefone text, placa text, cancelada boolean
)
language sql stable security definer set search_path = '' as $$
  select r.id, p.apelido, r.car_label, r.origem, r.destino, r.saida_em, r.vagas,
         r.vagas - (select count(*)::integer from public.ride_requests a where a.ride_id = r.id and a.status = 'aceita'),
         r.observacao, r.driver_id = auth.uid(), q.id, q.status,
         case when q.status = 'aceita' then p.telefone end,
         case when q.status = 'aceita' then c.placa end,
         r.status = 'cancelada'
  from public.rides r
  join public.profiles p on p.id = r.driver_id
  left join public.user_cars c on c.id = r.car_id
  left join public.ride_requests q on q.ride_id = r.id and q.passenger_id = auth.uid()
                                                                                                  
  where auth.uid() is not null and r.saida_em > now() - interval '1 hour'
    and (r.status = 'aberta' or q.status in ('pendente', 'aceita'))
  order by r.saida_em
  limit 100;
$$;

                                                                                               
create function public.my_ride_requests() returns table (
  id uuid, ride_id uuid, passageiro text, mensagem text, status text, telefone text
)
language sql stable security definer set search_path = '' as $$
  select q.id, q.ride_id, p.apelido, q.mensagem, q.status, case when q.status = 'aceita' then p.telefone end
  from public.ride_requests q
  join public.rides r on r.id = q.ride_id
  join public.profiles p on p.id = q.passenger_id
  where r.driver_id = auth.uid() and q.status <> 'cancelada'
  order by q.created_at;
$$;

revoke execute on function public.offer_ride(uuid, text, text, timestamptz, integer, text) from public, anon;
revoke execute on function public.cancel_ride(uuid) from public, anon;
revoke execute on function public.request_ride(uuid, text) from public, anon;
revoke execute on function public.cancel_request(uuid) from public, anon;
revoke execute on function public.respond_request(uuid, boolean) from public, anon;
revoke execute on function public.list_rides() from public, anon;
revoke execute on function public.my_ride_requests() from public, anon;
grant execute on function public.offer_ride(uuid, text, text, timestamptz, integer, text) to authenticated;
grant execute on function public.cancel_ride(uuid) to authenticated;
grant execute on function public.request_ride(uuid, text) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.respond_request(uuid, boolean) to authenticated;
grant execute on function public.list_rides() to authenticated;
grant execute on function public.my_ride_requests() to authenticated;
