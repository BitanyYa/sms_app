-- Drop the unique constraint on Warranty.imei
-- A device can have multiple warranty records over its lifetime;
-- deduplication is handled at the warrantyId level instead.
DROP INDEX IF EXISTS "Warranty_imei_key";
