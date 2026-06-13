-- Collapse the "student returns money" step: approval now completes a request
-- immediately. Migrate any in-flight requests (attended / pending_return) to
-- completed so they aren't stranded without a completion action in the UI.
--
-- The completer (returnedBy/returnedAt) is backfilled from the existing
-- attended-by data where the return wasn't already recorded.
UPDATE "AdvanceRequest"
SET
  "status"     = 'completed',
  "returnedBy" = COALESCE("returnedBy", "attendedBy"),
  "returnedAt" = COALESCE("returnedAt", "attendedAt", CURRENT_TIMESTAMP)
WHERE "status" IN ('attended', 'pending_return');
