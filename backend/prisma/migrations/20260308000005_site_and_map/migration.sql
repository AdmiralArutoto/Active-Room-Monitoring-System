-- AlterEnum
ALTER TYPE "AreaType" ADD VALUE 'SITE';

-- AlterTable
ALTER TABLE "Area" ADD COLUMN "image_path" TEXT,
                   ADD COLUMN "map_x" DOUBLE PRECISION,
                   ADD COLUMN "map_y" DOUBLE PRECISION;
