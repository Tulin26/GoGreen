                                                                               

alter table public.profiles
  add column transportes text[] not null default '{}'
  check (transportes <@ array['carro', 'bike', 'onibus', 'ape']);
grant update (transportes) on public.profiles to authenticated;

alter table public.user_cars
  add column kwh_km numeric(5, 3) check (kwh_km is null or kwh_km between 0.02 and 1);

alter table public.user_cars drop constraint user_cars_combustivel_check;
alter table public.user_cars add constraint user_cars_combustivel_check
  check (combustivel in ('gasolina', 'etanol', 'flex', 'diesel', 'eletrico'));

alter table public.user_cars drop constraint user_cars_check;
alter table public.user_cars add constraint user_cars_check check (
  (combustivel = 'gasolina' and km_l_gasolina is not null)
  or (combustivel = 'etanol' and km_l_etanol is not null)
  or (combustivel = 'diesel' and km_l_diesel is not null)
  or (combustivel = 'flex' and km_l_gasolina is not null and km_l_etanol is not null)
  or (combustivel = 'eletrico' and kwh_km is not null)
);

grant insert (kwh_km), update (kwh_km) on public.user_cars to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_telefone text := regexp_replace(coalesce(v_meta ->> 'telefone', ''), '[^0-9]', '', 'g');
  v_usuario text := lower(trim(coalesce(v_meta ->> 'usuario', '')));
  v_carro jsonb := v_meta -> 'carro';
  v_transportes text[] := '{}';
begin
                                                                                               
  if v_telefone !~ '^[0-9]{10,13}$' then v_telefone := null; end if;
  if v_usuario !~ '^[a-z0-9_.]{3,30}$' or exists (select 1 from public.profiles where usuario = v_usuario) then
    v_usuario := null;
  end if;
  if jsonb_typeof(v_meta -> 'transportes') = 'array' then
    select coalesce(array_agg(distinct t), '{}') into v_transportes
    from jsonb_array_elements_text(v_meta -> 'transportes') as t
    where t in ('carro', 'bike', 'onibus', 'ape');
  end if;

  insert into public.profiles (id, apelido, telefone, usuario, transportes)
  values (
    new.id,
    coalesce(nullif(left(trim(v_meta ->> 'apelido'), 40), ''), 'Morador'),
    v_telefone,
    v_usuario,
    v_transportes
  );

  if jsonb_typeof(v_carro) = 'object' then
    begin
      insert into public.user_cars (
        user_id, marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel,
        co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, kwh_km, origem_consumo
      ) values (
        new.id, v_carro ->> 'marca', v_carro ->> 'modelo', v_carro ->> 'versao', (v_carro ->> 'ano')::integer,
        v_carro ->> 'placa', v_carro ->> 'combustivel',
        (v_carro ->> 'km_l_gasolina')::numeric, (v_carro ->> 'km_l_etanol')::numeric, (v_carro ->> 'km_l_diesel')::numeric,
        (v_carro ->> 'co2_g_km_gasolina')::numeric, (v_carro ->> 'co2_g_km_etanol')::numeric, (v_carro ->> 'co2_g_km_diesel')::numeric,
        (v_carro ->> 'kwh_km')::numeric, coalesce(v_carro ->> 'origem_consumo', 'manual')
      );
    exception when others then
      null;                                                        
    end;
                                                                   
    begin
      update auth.users set raw_user_meta_data = raw_user_meta_data - 'carro' where id = new.id;
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;
