DELETE FROM "user_credit_lines" u
USING "user_credit_lines" d
WHERE u."userId" = d."userId"
  AND (
    u."updatedAt" < d."updatedAt"
    OR (u."updatedAt" = d."updatedAt" AND u."id" < d."id")
  );

CREATE UNIQUE INDEX "user_credit_lines_userId_key" ON "user_credit_lines"("userId");
