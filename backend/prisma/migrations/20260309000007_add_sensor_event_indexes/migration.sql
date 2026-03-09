-- Add indexes for event queries (filter by sensor, order by timestamp)
CREATE INDEX "SensorEvent_sensor_id_ts_idx" ON "SensorEvent"("sensor_id", "ts" DESC);
CREATE INDEX "SensorEvent_ts_idx" ON "SensorEvent"("ts" DESC);
