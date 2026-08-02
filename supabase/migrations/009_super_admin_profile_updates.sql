-- 009: Grant super admins UPDATE on profiles (needed for per-account suspension)

create policy "Super admins can update profiles"
on public.profiles
for update
to authenticated
using (is_super_admin());
