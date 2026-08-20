-- Per-user "clear chat" cutoff. Messages at/before this time are hidden for
-- this participant only; the other party keeps their full history.
ALTER TABLE "ConversationParticipant" ADD COLUMN "clearedAt" TIMESTAMP(3);

-- Blocking (implicit m2m self-relation on User). A = blocker, B = blocked.
CREATE TABLE "_UserBlocks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserBlocks_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_UserBlocks_B_index" ON "_UserBlocks"("B");

ALTER TABLE "_UserBlocks" ADD CONSTRAINT "_UserBlocks_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UserBlocks" ADD CONSTRAINT "_UserBlocks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
