-- Spice Route — legal / compliance fields.
--
-- RUN ELEVENTH, after gallery.sql. Safe to re-run.
--
-- Indian food businesses must display their FSSAI licence number in-app, and
-- Play Store review + Razorpay activation both require the business address and
-- policies to be visible. These columns feed the customer "About & policies"
-- screen.

alter table kitchens add column if not exists fssai_number text;
alter table kitchens add column if not exists fssai_valid_until date;
alter table kitchens add column if not exists legal_address text;
alter table kitchens add column if not exists support_email text;

-- Seed Nandhan Delight's real registration details (from the FSSAI certificate).
update kitchens
   set fssai_number     = coalesce(fssai_number, '22426294000044'),
       fssai_valid_until = coalesce(fssai_valid_until, date '2028-01-27'),
       legal_address    = coalesce(
         legal_address,
         'No. 606/1, Palaniyappa Nagar, Rakkiyapalayam Road, Ammapalayam, Avinashi block, Tirupur, Tamil Nadu 641652'
       )
 where slug = 'nandhan-delight';
