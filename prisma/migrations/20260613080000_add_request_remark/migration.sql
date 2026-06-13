-- Add an optional requester remark to advance requests, captured at
-- submission time and kept separate from the approver's comment.
ALTER TABLE "AdvanceRequest" ADD COLUMN "remark" TEXT;
