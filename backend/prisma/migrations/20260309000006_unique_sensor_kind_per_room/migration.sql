-- Remove unused enum values
ALTER TYPE "SensorKind" RENAME TO "SensorKind_old";
CREATE TYPE "SensorKind" AS ENUM ('MOTION', 'LIGHT');
ALTER TABLE "Sensor" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "Sensor" ALTER COLUMN "kind" TYPE "SensorKind" USING ("kind"::text::"SensorKind");
DROP TYPE "SensorKind_old";

-- Add unique constraint: one sensor per kind per room
CREATE UNIQUE INDEX "Sensor_room_area_id_kind_key" ON "Sensor"("room_area_id", "kind");
