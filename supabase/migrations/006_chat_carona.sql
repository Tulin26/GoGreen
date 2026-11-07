                                                                                                     
                                                                                                          
                                                                                                            
create table public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index ride_messages_thread_idx on public.ride_messages (ride_id, passenger_id, created_at);
create index ride_messages_passenger_idx on public.ride_messages (passenger_id);
create index ride_messages_sender_idx on public.ride_messages (sender_id);
alter table public.ride_messages enable row level security;
revoke all on public.ride_messages from anon, authenticated;

                                                    
create function public.send_ride_message(p_ride uuid, p_passenger uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ride public.rides%rowtype;
  v_passenger uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para conversar.' using errcode = '28000'; end if;
  select * into v_ride from public.rides where id = p_ride;
  if not found then raise exception 'Carona não encontrada.' using errcode = 'P0002'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Escreva uma mensagem.' using errcode = 'P0001'; end if;
  if char_length(p_body) > 500 then raise exception 'Mensagem longa demais (máximo 500 letras).' using errcode = 'P0001'; end if;
  if auth.uid() = v_ride.driver_id then
                                                  
    v_passenger := p_passenger;
    if v_passenger is null or not exists (select 1 from public.ride_messages where ride_id = p_ride and passenger_id = v_passenger) then
      raise exception 'Você só pode responder uma conversa que o passageiro começou.' using errcode = 'P0001';
    end if;
  else
    if coalesce(p_passenger, auth.uid()) <> auth.uid() then raise exception 'Conversa não encontrada.' using errcode = 'P0002'; end if;
    if v_ride.status <> 'aberta' then raise exception 'Esta carona não está mais disponível.' using errcode = 'P0001'; end if;
    v_passenger := auth.uid();
  end if;
  if (select count(*) from public.ride_messages where sender_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Muitas mensagens em pouco tempo. Tente daqui a pouco.' using errcode = 'P0001';
  end if;
  insert into public.ride_messages (ride_id, passenger_id, sender_id, body)
  values (p_ride, v_passenger, auth.uid(), trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.list_ride_messages(p_ride uuid, p_passenger uuid) returns table (
  id uuid, mine boolean, autor text, body text, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_driver uuid;
  v_passenger uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para conversar.' using errcode = '28000'; end if;
  select r.driver_id into v_driver from public.rides r where r.id = p_ride;
  if not found then raise exception 'Carona não encontrada.' using errcode = 'P0002'; end if;
  v_passenger := coalesce(p_passenger, auth.uid());
  if auth.uid() <> v_driver and auth.uid() <> v_passenger then raise exception 'Conversa não encontrada.' using errcode = 'P0002'; end if;
  return query
    select m.id, m.sender_id = auth.uid(), p.apelido, m.body, m.created_at
    from public.ride_messages m
    join public.profiles p on p.id = m.sender_id
    where m.ride_id = p_ride and m.passenger_id = v_passenger
    order by m.created_at, m.id
    limit 200;
end;
$$;

create function public.my_ride_chats() returns table (
  ride_id uuid, passenger_id uuid, sou_motorista boolean, outro text, origem text, destino text, ultima text, ultima_em timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, t.passenger_id, r.driver_id = auth.uid(),
         case when r.driver_id = auth.uid() then pp.apelido else dp.apelido end,
         r.origem, r.destino, t.ultima, t.ultima_em
  from (
    select distinct on (m.ride_id, m.passenger_id) m.ride_id, m.passenger_id, m.body as ultima, m.created_at as ultima_em
    from public.ride_messages m
    order by m.ride_id, m.passenger_id, m.created_at desc
  ) t
  join public.rides r on r.id = t.ride_id
  join public.profiles dp on dp.id = r.driver_id
  join public.profiles pp on pp.id = t.passenger_id
  where auth.uid() is not null and (r.driver_id = auth.uid() or t.passenger_id = auth.uid())
  order by t.ultima_em desc
  limit 50;
$$;

revoke execute on function public.send_ride_message(uuid, uuid, text) from public, anon;
revoke execute on function public.list_ride_messages(uuid, uuid) from public, anon;
revoke execute on function public.my_ride_chats() from public, anon;
grant execute on function public.send_ride_message(uuid, uuid, text) to authenticated;
grant execute on function public.list_ride_messages(uuid, uuid) to authenticated;
grant execute on function public.my_ride_chats() to authenticated;
