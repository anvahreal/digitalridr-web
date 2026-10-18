-- Notify administrators after a user signs up. This fails open: an alert
-- outage must never prevent an account from being created.
-- The shared value is generated in Vault and exposed only to service_role.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'digitalridr_project_url') then
    perform vault.create_secret('https://gkddamxgkpkzgjjrrqez.supabase.co', 'digitalridr_project_url');
  end if;

  if not exists (select 1 from vault.secrets where name = 'admin_notification_webhook_secret') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'admin_notification_webhook_secret');
  end if;
end;
$$;

create or replace function public.get_admin_notification_webhook_secret()
returns text
language sql
security definer
set search_path = pg_catalog, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'admin_notification_webhook_secret'
  limit 1;
$$;

revoke all on function public.get_admin_notification_webhook_secret() from public, anon, authenticated;
grant execute on function public.get_admin_notification_webhook_secret() to service_role;

create or replace function public.notify_admins_of_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  project_url text;
  webhook_secret text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'digitalridr_project_url'
  limit 1;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'admin_notification_webhook_secret'
  limit 1;

  perform net.http_post(
    url := project_url || '/functions/v1/notify-admins',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-event-secret', webhook_secret
    ),
    body := jsonb_build_object('event', 'new_user', 'resourceId', new.id::text)
  );
  return new;
exception when others then
  raise warning 'New-user admin email could not be queued: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_admins_of_new_user() from public, anon, authenticated;

drop trigger if exists notify_admins_on_new_user on auth.users;
create trigger notify_admins_on_new_user
  after insert on auth.users
  for each row execute function public.notify_admins_of_new_user();
