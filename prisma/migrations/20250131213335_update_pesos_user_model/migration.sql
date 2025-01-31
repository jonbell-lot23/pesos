-- CreateTable
CREATE TABLE "pesos_items" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "postdate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "slug" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "sourceId" INTEGER,

    CONSTRAINT "pesos_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pesos_items_slug_key" ON "pesos_items"("slug");

-- AddForeignKey
ALTER TABLE "pesos_items" ADD CONSTRAINT "pesos_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pesos_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesos_items" ADD CONSTRAINT "pesos_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "pesos_Sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
