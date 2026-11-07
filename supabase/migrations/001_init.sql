                                                 
                                                                                                                    

                                                                              
         
                                                                              
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text not null default 'Morador' check (char_length(apelido) between 1 and 40),
  turma text check (turma is null or char_length(turma) between 1 and 30),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "cada pessoa vê o próprio perfil" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "cada pessoa edita o próprio perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

                                                            
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (apelido, turma) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, apelido, turma)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'apelido'), 40), ''), 'Morador'),
    nullif(left(upper(trim(new.raw_user_meta_data ->> 'turma')), 30), '')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

                                                                              
                       
                                                                              
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category text not null check (category in ('buraco', 'calcada', 'rampa', 'iluminacao', 'cobertura', 'atraso')),
  severity text not null default 'atencao' check (severity in ('leve', 'atencao', 'grave')),
  description text check (description is null or char_length(description) <= 280),
  lat double precision not null check (lat between -21.45 and -20.95),
  lng double precision not null check (lng between -50.75 and -50.15),
  bairro text check (bairro is null or char_length(bairro) <= 80),
  line_code text check (line_code is null or char_length(line_code) <= 6),
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  status text not null default 'aberto' check (status in ('aberto', 'analise', 'resolvido')),
  confirmations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
create index reports_created_idx on public.reports (created_at desc);
create index reports_user_idx on public.reports (user_id);

alter table public.reports enable row level security;

create policy "relatos são públicos" on public.reports
  for select to anon, authenticated using (true);
create policy "quem está logado relata em nome próprio" on public.reports
  for insert to authenticated with check (user_id = auth.uid());
create policy "autor apaga o próprio relato" on public.reports
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

                                                                             
revoke all on public.reports from anon, authenticated;
grant select (id, category, severity, description, lat, lng, bairro, line_code, photo_path, status, confirmations, created_at, updated_at)
  on public.reports to anon, authenticated;
grant insert (category, severity, description, lat, lng, bairro, line_code, photo_path) on public.reports to authenticated;
grant delete on public.reports to authenticated;

                               
create function public.reports_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 15 then
    raise exception 'Limite de 15 relatos por dia atingido.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.reports_rate_limit() from public, anon, authenticated;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.reports_rate_limit();

create function public.my_report_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.reports where user_id = auth.uid();
$$;
revoke execute on function public.my_report_ids() from public, anon;
grant execute on function public.my_report_ids() to authenticated;

                                                                              
                 
                                                                              
create table public.report_confirmations (
  report_id uuid not null references public.reports (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);
create index report_confirmations_user_idx on public.report_confirmations (user_id);

alter table public.report_confirmations enable row level security;
create policy "cada pessoa vê as próprias confirmações" on public.report_confirmations
  for select to authenticated using (user_id = auth.uid());
revoke all on public.report_confirmations from anon, authenticated;
grant select on public.report_confirmations to authenticated;

create function public.confirm_report(p_report uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_total integer;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para confirmar.' using errcode = '28000'; end if;
  select user_id into v_owner from public.reports where id = p_report;
  if v_owner is null then raise exception 'Relato não encontrado.' using errcode = 'P0002'; end if;
  if v_owner = auth.uid() then raise exception 'Você não pode confirmar o próprio relato.' using errcode = 'P0001'; end if;
  insert into public.report_confirmations (report_id, user_id) values (p_report, auth.uid())
    on conflict do nothing;
  update public.reports
    set confirmations = (select count(*) from public.report_confirmations where report_id = p_report)
    where id = p_report
    returning confirmations into v_total;
  return v_total;
end;
$$;
revoke execute on function public.confirm_report(uuid) from public, anon;
grant execute on function public.confirm_report(uuid) to authenticated;

create function public.set_report_status(p_report uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe responsável muda o status.' using errcode = '42501'; end if;
  if p_status not in ('aberto', 'analise', 'resolvido') then raise exception 'Status inválido.' using errcode = '22023'; end if;
  update public.reports set status = p_status, updated_at = now() where id = p_report;
end;
$$;
revoke execute on function public.set_report_status(uuid, text) from public, anon;
grant execute on function public.set_report_status(uuid, text) to authenticated;

                                                                              
                 
                                                                                    
                                                                                       
                                                                     
                                                                              
create table public.bus_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  line_code text not null check (char_length(line_code) <= 6),
  direction text check (direction is null or char_length(direction) <= 40),
  public_token uuid default gen_random_uuid(),
  ping_count integer not null default 0,
  started_at timestamptz not null default now(),
  last_ping_at timestamptz,
  ended_at timestamptz
);
create index bus_trips_user_idx on public.bus_trips (user_id, started_at desc);
alter table public.bus_trips enable row level security;
revoke all on public.bus_trips from anon, authenticated;

create table public.bus_positions (
  id bigint generated always as identity primary key,
  token uuid not null,
  line_code text not null,
  direction text,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);
create index bus_positions_recent_idx on public.bus_positions (recorded_at desc);
alter table public.bus_positions enable row level security;
create policy "posições recentes são públicas" on public.bus_positions
  for select to anon, authenticated using (recorded_at > now() - interval '3 minutes');
revoke all on public.bus_positions from anon, authenticated;
grant select on public.bus_positions to anon, authenticated;

create function public.start_bus_trip(p_line text, p_direction text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para informar o ônibus.' using errcode = '28000'; end if;
  update public.bus_trips set ended_at = now(), public_token = null
    where user_id = auth.uid() and ended_at is null;
  insert into public.bus_trips (user_id, line_code, direction)
    values (auth.uid(), left(p_line, 6), left(p_direction, 40))
    returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.start_bus_trip(text, text) from public, anon;
grant execute on function public.start_bus_trip(text, text) to authenticated;

create function public.report_bus_position(p_trip uuid, p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.bus_trips%rowtype;
begin
  select * into v from public.bus_trips where id = p_trip and user_id = auth.uid() and ended_at is null;
  if not found then raise exception 'Viagem encerrada.' using errcode = 'P0002'; end if;
  if p_lat not between -21.45 and -20.95 or p_lng not between -50.75 and -50.15 then
    raise exception 'Posição fora da área atendida.' using errcode = '22023';
  end if;
  if v.started_at < now() - interval '2 hours' then
    update public.bus_trips set ended_at = now(), public_token = null where id = p_trip;
    raise exception 'Viagem encerrada por tempo.' using errcode = 'P0002';
  end if;
  if v.last_ping_at is not null and v.last_ping_at > now() - interval '8 seconds' then
    return;
  end if;
  insert into public.bus_positions (token, line_code, direction, lat, lng)
    values (v.public_token, v.line_code, v.direction, p_lat, p_lng);
  update public.bus_trips set ping_count = ping_count + 1, last_ping_at = now() where id = p_trip;
  delete from public.bus_positions where recorded_at < now() - interval '30 minutes';
end;
$$;
revoke execute on function public.report_bus_position(uuid, double precision, double precision) from public, anon;
grant execute on function public.report_bus_position(uuid, double precision, double precision) to authenticated;

create function public.end_bus_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bus_trips set ended_at = now(), public_token = null
    where id = p_trip and user_id = auth.uid() and ended_at is null;
end;
$$;
revoke execute on function public.end_bus_trip(uuid) from public, anon;
grant execute on function public.end_bus_trip(uuid) to authenticated;

                                                                              
                   
                                                                                  
                                                                              
create function public.points_by_user() returns table (
  user_id uuid, relatos bigint, com_foto bigint, viagens bigint, confirmacoes bigint, pontos bigint
)
language sql stable security definer set search_path = '' as $$
  with r as (
    select user_id, count(*) as relatos, count(photo_path) as com_foto from public.reports group by 1
  ), t as (
    select user_id, sum(least(n, 5))::bigint as viagens from (
      select user_id, date_trunc('day', started_at) as d, count(*) as n
      from public.bus_trips where ping_count >= 8 group by 1, 2
    ) x group by 1
  ), c as (
    select user_id, count(*) as confirmacoes from public.report_confirmations group by 1
  )
  select p.id,
         coalesce(r.relatos, 0), coalesce(r.com_foto, 0), coalesce(t.viagens, 0), coalesce(c.confirmacoes, 0),
         coalesce(r.relatos, 0) * 10 + coalesce(r.com_foto, 0) * 5 + coalesce(t.viagens, 0) * 5 + coalesce(c.confirmacoes, 0) * 2
  from public.profiles p
  left join r on r.user_id = p.id
  left join t on t.user_id = p.id
  left join c on c.user_id = p.id;
$$;
revoke execute on function public.points_by_user() from public, anon, authenticated;

                                                                
create function public.ranking_turmas() returns table (
  turma text, participantes bigint, relatos bigint, viagens bigint, confirmacoes bigint, pontos bigint
)
language sql stable security definer set search_path = '' as $$
  select p.turma, count(*), sum(u.relatos)::bigint, sum(u.viagens)::bigint, sum(u.confirmacoes)::bigint, sum(u.pontos)::bigint
  from public.points_by_user() u
  join public.profiles p on p.id = u.user_id
  where p.turma is not null
  group by p.turma
  having sum(u.pontos) > 0
  order by 6 desc, 1
  limit 50;
$$;
grant execute on function public.ranking_turmas() to anon, authenticated;

create function public.my_points() returns table (relatos bigint, com_foto bigint, viagens bigint, confirmacoes bigint, pontos bigint)
language sql stable security definer set search_path = '' as $$
  select relatos, com_foto, viagens, confirmacoes, pontos from public.points_by_user() where user_id = auth.uid();
$$;
revoke execute on function public.my_points() from public, anon;
grant execute on function public.my_points() to authenticated;

                                                                              
                                                                               
                                                                              
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 3145728, array['image/jpeg']);

create policy "pessoa logada envia foto na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pessoa logada apaga foto da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
