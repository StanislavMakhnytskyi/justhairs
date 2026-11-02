-- justhairs — remove the auth-era schema. OPTIONAL and DESTRUCTIVE.
--
-- Sign-in was removed in 0003 and nothing in the app reads or writes any of
-- this (CODE_REVIEW.md #12). Dropping it removes the dead tables, the trigger
-- on auth.users, and the policies and grants that went with them.
--
-- IRREVERSIBLE: any rows in profiles / orders / order_items / payments /
-- favorites / notifications (e.g. your own test sign-ups from the auth era)
-- are deleted, as are the always-null customer_id columns. Skip this file if
-- you want to keep that data; 0007 already closed these tables to the API.
-- Re-runnable.

-- the "create a profile on sign-up" hook on Supabase's auth table
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- order matters only for the columns that reference profiles
drop table if exists public.notifications, public.favorites, public.payments,
                     public.order_items, public.orders;

alter table public.reviews      drop column if exists customer_id;
alter table public.appointments drop column if exists customer_id;

drop table if exists public.profiles;
drop function if exists public.is_admin();
drop type if exists public.user_role;
