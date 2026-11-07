-- Base do banco no Neon (Postgres puro). Recria o que as migrações em supabase/migrations esperam encontrar:
-- os papéis anon/authenticated, auth.uid() e a tabela auth.users. O login é feito pelo servidor (api/), não pelo banco.
create role anon nologin;
create role authenticated nologin;
grant anon, authenticated to current_user;

create schema auth;
create schema storage;
grant usage on schema public, auth, storage to anon, authenticated;

-- Quem está agindo: o servidor grava o id da pessoa em request.uid, só dentro da transação.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb,
  email text unique,
  senha_hash text
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.uid', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

-- Tentativas de login que falharam, para limitar quem tenta adivinhar senhas.
create table auth.tentativas (
  chave text not null,
  em timestamptz not null default now()
);
create index tentativas_chave_em on auth.tentativas (chave, em);

-- O armazenamento de fotos do Supabase não existe aqui; a migração 001 só precisa destas tabelas para rodar.
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant execute on function storage.foldername(text) to anon, authenticated;
