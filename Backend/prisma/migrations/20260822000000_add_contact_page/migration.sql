-- Admin-editable Contact Us page content. A single row keyed "singleton";
-- the API seeds sensible defaults on first read (contactController.ensureSeeded),
-- so this migration only creates the table.

-- CreateTable
CREATE TABLE "ContactPage" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heading" TEXT NOT NULL DEFAULT 'Get in touch',
    "subheading" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "mapEmbedUrl" TEXT NOT NULL DEFAULT '',
    "responseNote" TEXT NOT NULL DEFAULT '',
    "officeHours" JSONB NOT NULL DEFAULT '[]',
    "socials" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "formEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPage_pkey" PRIMARY KEY ("id")
);
