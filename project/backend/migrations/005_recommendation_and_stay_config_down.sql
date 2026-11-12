-- ============================================================================
-- MIGRATION: 005_recommendation_and_stay_config_down.sql (DOWN)
-- ============================================================================

DROP INDEX IF EXISTS idx_rooms_rt_status ON ROOMS;
DROP INDEX IF EXISTS idx_room_types_apt_active ON room_types;
DROP INDEX IF EXISTS idx_bookings_apt_status_end_at ON BOOKINGS;
DROP INDEX IF EXISTS idx_bookings_rt_status_times ON BOOKINGS;

ALTER TABLE Booking_rooms
  DROP COLUMN IF EXISTS unit_price,
  DROP COLUMN IF EXISTS children,
  DROP COLUMN IF EXISTS adults;

ALTER TABLE BOOKINGS
  DROP COLUMN IF EXISTS room_type_id,
  DROP COLUMN IF EXISTS end_at,
  DROP COLUMN IF EXISTS start_at,
  DROP COLUMN IF EXISTS stay_type;

DROP TABLE IF EXISTS stay_type_config;
