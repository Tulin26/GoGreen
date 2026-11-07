                                                 

alter table public.profiles
  add column usuario text check (usuario is null or usuario ~ '^[a-z0-9_.]{3,30}$');
create unique index profiles_usuario_key on public.profiles (usuario);
grant update (usuario) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_telefone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '[^0-9]', '', 'g');
  v_usuario text := lower(trim(coalesce(new.raw_user_meta_data ->> 'usuario', '')));
begin
                                                                                                              
  if v_telefone !~ '^[0-9]{10,13}$' then v_telefone := null; end if;
  if v_usuario !~ '^[a-z0-9_.]{3,30}$' or exists (select 1 from public.profiles where usuario = v_usuario) then
    v_usuario := null;
  end if;
  insert into public.profiles (id, apelido, telefone, usuario)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'apelido'), 40), ''), 'Morador'),
    v_telefone,
    v_usuario
  );
  return new;
end;
$$;

                                                                                    
                                                                                                                
create function public.email_do_usuario(p_usuario text) returns text
language sql stable security definer set search_path = '' as $$
  select u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.usuario = lower(trim(p_usuario));
$$;

create function public.usuario_disponivel(p_usuario text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where usuario = lower(trim(p_usuario)));
$$;

revoke execute on function public.email_do_usuario(text) from public;
revoke execute on function public.usuario_disponivel(text) from public;
grant execute on function public.email_do_usuario(text) to anon, authenticated;
grant execute on function public.usuario_disponivel(text) to anon, authenticated;
