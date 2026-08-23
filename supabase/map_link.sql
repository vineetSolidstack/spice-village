-- Spice Route — kitchen map/location link.
--
-- RUN after reports.sql. Safe to re-run.
--
-- A link customers tap to see exactly where the kitchen is (a Google Maps
-- share link, or any maps URL). Shown on the storefront and About page.

alter table kitchens add column if not exists map_url text;
