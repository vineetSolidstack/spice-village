-- Spice Route — multiple photos per dish.
--
-- RUN TENTH, after payments.sql. Safe to re-run.
--
-- A dish can carry several photos; the customer app auto-swipes through them.
-- Stored as an ordered array of public Storage URLs. `image_path` stays as the
-- single primary/cover for anything that wants just one image.

alter table dishes add column if not exists images text[] not null default '{}';

-- Backfill: seed the array from the existing single photo so nothing loses its
-- picture when the app starts reading `images`.
update dishes
   set images = array[image_path]
 where image_path is not null
   and (images is null or array_length(images, 1) is null);
