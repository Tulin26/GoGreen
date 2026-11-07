                                                                               
                                                                               
create function public.delete_vehicle_and_routes(p_vehicle uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para apagar o veículo.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.user_cars where id = p_vehicle and user_id = auth.uid()) then
    raise exception 'Veículo não encontrado.' using errcode = 'P0002';
  end if;

  delete from public.daily_routes where user_id = auth.uid() and car_id = p_vehicle;
  delete from public.user_cars where id = p_vehicle and user_id = auth.uid();
end;
$$;

revoke execute on function public.delete_vehicle_and_routes(uuid) from public, anon;
grant execute on function public.delete_vehicle_and_routes(uuid) to authenticated;
