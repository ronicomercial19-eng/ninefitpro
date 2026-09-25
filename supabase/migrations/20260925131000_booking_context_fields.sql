alter table public.gym_classes add column if not exists instructor_id uuid;
alter table public.gym_classes add column if not exists service_id uuid;
alter table public.class_bookings add column if not exists instructor_id uuid;
alter table public.class_bookings add column if not exists service_id uuid;

create index if not exists idx_gym_classes_instructor on public.gym_classes(instructor_id);
create index if not exists idx_class_bookings_context on public.class_bookings(instructor_id, service_id);
