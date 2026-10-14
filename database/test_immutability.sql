-- Cleanup test data (must delete audit events first via a superuser bypass,
-- but since the trigger blocks it, we just leave test data in place.
-- In production, use a dedicated test database instead.)
-- This no-op cleanup marks the end of M0-07 verification.
SELECT 'M0-07 verification complete' AS result;
