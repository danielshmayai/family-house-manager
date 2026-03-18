-- Add type column to OtpCode to distinguish 2FA codes from password-reset codes
-- Default '2fa' so all existing rows are treated as 2FA codes (backward compatible)
ALTER TABLE "OtpCode" ADD COLUMN "type" TEXT NOT NULL DEFAULT '2fa';
