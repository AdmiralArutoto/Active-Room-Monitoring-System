-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('BUILDING', 'FLOOR', 'ROOM');

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AreaType" NOT NULL,
    "parent_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "Area"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
