DO $$ BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('MFA_ENROLL', 'PASSWORD_CHANGE', 'CONTACT_CHANGE', 'HIGH_VALUE_TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OtpChallenge"
    ALTER COLUMN "purpose" TYPE "OtpPurpose"
    USING "purpose"::"OtpPurpose";
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
