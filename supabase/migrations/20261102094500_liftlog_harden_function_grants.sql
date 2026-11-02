revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- username_available is intentionally callable before sign-in (register screen); it only returns a boolean
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
