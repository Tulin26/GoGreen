-- O gatilho de cadastro ignorava o tipo do veículo: uma moto cadastrada junto com a conta virava carro. Agora lê o tipo (carro ou moto).
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
        user_id, tipo, marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel,
        co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, kwh_km, origem_consumo
      ) values (
        new.id, coalesce(nullif(v_carro ->> 'tipo', ''), 'carro'), v_carro ->> 'marca', v_carro ->> 'modelo', v_carro ->> 'versao', (v_carro ->> 'ano')::integer,
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
