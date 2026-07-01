-- CreateTable
CREATE TABLE "RoomLightingRollup" (
    "id" TEXT NOT NULL,
    "room_area_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wasted_minutes" INTEGER NOT NULL DEFAULT 0,
    "lights_on_minutes" INTEGER NOT NULL DEFAULT 0,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomLightingRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomLightingRollup_date_idx" ON "RoomLightingRollup"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RoomLightingRollup_room_area_id_date_key" ON "RoomLightingRollup"("room_area_id", "date");

-- AddForeignKey
ALTER TABLE "RoomLightingRollup" ADD CONSTRAINT "RoomLightingRollup_room_area_id_fkey"
    FOREIGN KEY ("room_area_id") REFERENCES "Area"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
