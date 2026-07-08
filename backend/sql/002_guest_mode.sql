alter table spaces add column is_guest boolean not null default false;
create index if not exists spaces_guest_expiry_idx on spaces (is_guest, created_at) where is_guest;
