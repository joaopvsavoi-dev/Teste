-- Norte — suporte à sincronização com o Google Agenda (§11)
-- Tokens do Google ficam no Supabase Vault; só as Edge Functions (service role) chamam estas funções.

create or replace function norte_salvar_refresh_token(p_user uuid, p_token text)
returns uuid language plpgsql security definer set search_path = public, vault as $$
declare
  sid uuid;
begin
  select refresh_token_secret_id into sid from gcal_sync_estado where user_id = p_user;
  if sid is null then
    sid := vault.create_secret(p_token, 'gcal_refresh_' || p_user::text);
    insert into gcal_sync_estado (user_id, calendar_id, refresh_token_secret_id)
      values (p_user, '', sid)
      on conflict (user_id) do update set refresh_token_secret_id = excluded.refresh_token_secret_id;
  else
    perform vault.update_secret(sid, p_token);
  end if;
  return sid;
end $$;

create or replace function norte_ler_refresh_token(p_user uuid)
returns text language sql security definer set search_path = public, vault as $$
  select s.decrypted_secret
  from gcal_sync_estado g join vault.decrypted_secrets s on s.id = g.refresh_token_secret_id
  where g.user_id = p_user
$$;

revoke all on function norte_salvar_refresh_token(uuid, text) from public, anon, authenticated;
revoke all on function norte_ler_refresh_token(uuid) from public, anon, authenticated;

-- Agendamentos (pg_cron + pg_net). Ajuste <PROJECT_REF> e a service role key antes de rodar:
-- select cron.schedule('gcal-sync-fallback', '*/15 * * * *', $$
--   select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/gcal-sync',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
--     body := '{"todos": true}'::jsonb) $$);
-- select cron.schedule('gcal-renew-channels', '0 4 * * *', $$
--   select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/gcal-renew-channels',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb) $$);
