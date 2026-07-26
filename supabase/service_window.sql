-- Spice Route — daily order cutoff.
--
-- RUN SIXTEENTH, after item_stock.sql. Safe to re-run.
--
-- A single time-of-day per kitchen. After it, the app closes today's pre-orders
-- and opens again tomorrow. If units are still left at the cutoff, each customer
-- gets a one-time 10-minute "last call" bundle window (handled in the app); when
-- nothing is left, it just shows closed.
--
-- Stored as a plain time (kitchen-local wall clock). The app compares it to the
-- device clock — fine for a single-city launch (Tirupur, IST).

alter table kitchens add column if not exists order_cutoff time;

-- Default the founder's kitchen to a 7pm cutoff if unset.
update kitchens set order_cutoff = '19:00'
 where slug = 'nandhan-delight' and order_cutoff is null;
