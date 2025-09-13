-- AlterTable: Add course_id to seat_maps table for multi-course classroom support
ALTER TABLE "seat_maps" ADD COLUMN "course_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "seat_maps" ADD CONSTRAINT "seat_maps_course_id_fkey" 
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop existing unique constraint if exists
ALTER TABLE "seat_maps" DROP CONSTRAINT IF EXISTS "seat_maps_classroom_id_row_column_session_date_session_num_key";

-- Create new unique constraint including course_id
ALTER TABLE "seat_maps" ADD CONSTRAINT "seat_maps_classroom_id_course_id_row_column_session_date_session_num_key" 
  UNIQUE ("classroom_id", "course_id", "row", "column", "session_date", "session_number");

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "seat_maps_course_id_idx" ON "seat_maps"("course_id");
CREATE INDEX IF NOT EXISTS "seat_maps_classroom_course_date_idx" ON "seat_maps"("classroom_id", "course_id", "session_date");