-- CreateEnum
CREATE TYPE "SensorKind" AS ENUM ('MOTION', 'LIGHT', 'TEMPERATURE', 'DOOR', 'OTHER');

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "sensor_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SensorKind" NOT NULL DEFAULT 'OTHER',
    "room_area_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorState" (
    "sensor_id" TEXT NOT NULL,
    "last_value" TEXT NOT NULL,
    "last_ts" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorState_pkey" PRIMARY KEY ("sensor_id")
);

-- CreateTable
CREATE TABLE "SensorEvent" (
    "id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_sensor_key_key" ON "Sensor"("sensor_key");

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_room_area_id_fkey"
    FOREIGN KEY ("room_area_id") REFERENCES "Area"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorState" ADD CONSTRAINT "SensorState_sensor_id_fkey"
    FOREIGN KEY ("sensor_id") REFERENCES "Sensor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorEvent" ADD CONSTRAINT "SensorEvent_sensor_id_fkey"
    FOREIGN KEY ("sensor_id") REFERENCES "Sensor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
