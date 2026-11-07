-- Direito de apagar os próprios dados (LGPD): remove a conta; perfil, veículos, rotas, pedidos e mensagens saem em cascata.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para apagá-la.' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
