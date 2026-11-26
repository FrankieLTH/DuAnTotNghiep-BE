-- Migration 018: Add missing columns for calendar and booking flow
-- checkout_data: required by customer-bookings.service.ts and cron job
-- pricing_snapshot: required by BookingRoom entity for multi-room bookings

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS checkout_data JSON NULL;

ALTER TABLE booking_rooms 
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSON NULL;
