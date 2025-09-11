-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'graduated', 'transferred', 'suspended', 'expelled');

-- CreateEnum
CREATE TYPE "StudentType" AS ENUM ('regular', 'exchange', 'transfer', 'audit', 'special');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('active', 'graduated', 'disbanded');

-- CreateEnum
CREATE TYPE "OperatorRole" AS ENUM ('teacher', 'student', 'admin', 'system');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('material', 'exercise', 'reference', 'multimedia', 'template');

-- CreateEnum
CREATE TYPE "PlayMode" AS ENUM ('manual', 'auto', 'remote');

-- AlterEnum
-- This migration adds members to the CourseMaterialType enum.
-- If this migration fails with an error, that means this enum already exists
-- and the new members have already been added.
ALTER TYPE "CourseMaterialType" ADD VALUE 'pdf';
ALTER TYPE "CourseMaterialType" ADD VALUE 'doc';
ALTER TYPE "CourseMaterialType" ADD VALUE 'docx';
ALTER TYPE "CourseMaterialType" ADD VALUE 'zip';
ALTER TYPE "CourseMaterialType" ADD VALUE 'link';

-- AlterEnum
-- This migration modifies the PresentationStatus enum.
ALTER TYPE "PresentationStatus" ADD VALUE 'ended';
ALTER TYPE "PresentationStatus" ADD VALUE 'error';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "academic_year" TEXT,
ADD COLUMN     "dormitory_info" TEXT,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "emergency_phone" TEXT,
ADD COLUMN     "enrollment_date" TIMESTAMP(3),
ADD COLUMN     "graduation_date" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "student_type" "StudentType" NOT NULL DEFAULT 'regular';

-- AlterTable
ALTER TABLE "student_classes" DROP COLUMN "class_name",
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "class_code",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "enrollment_year",
ADD COLUMN     "academic_year" TEXT,
DROP COLUMN "advisor",
ADD COLUMN     "class_teacher" TEXT,
DROP COLUMN "is_active",
ADD COLUMN     "status" "ClassStatus" NOT NULL DEFAULT 'active',
DROP COLUMN "description";

-- CreateUniqueIndex
CREATE UNIQUE INDEX "student_classes_code_key" ON "student_classes"("code");

-- AlterTable
ALTER TABLE "operation_logs" ADD COLUMN     "execution_time_ms" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "affected_ids" SET DATA TYPE JSONB,
ALTER COLUMN "operator_id" DROP NOT NULL,
ALTER COLUMN "operator_role" SET DATA TYPE "OperatorRole";

-- AlterTable
ALTER TABLE "course_materials" DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "file_upload_id" TEXT,
ADD COLUMN     "category" "MaterialCategory" NOT NULL DEFAULT 'material',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "fileUrl",
ADD COLUMN     "file_path" TEXT,
DROP COLUMN "fileName",
ADD COLUMN     "thumbnail_path" TEXT,
DROP COLUMN "isPublic",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_downloadable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_presentation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_login" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "order_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_accessed_at" TIMESTAMP(3),
DROP COLUMN "uploaderId",
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "updated_by" TEXT,
ALTER COLUMN "file_size" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "presentation_sessions" ADD COLUMN     "play_mode" "PlayMode" NOT NULL DEFAULT 'manual',
ADD COLUMN     "auto_advance_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "allow_student_control" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enable_annotations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enable_recording" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pause_time" TIMESTAMP(3),
ADD COLUMN     "resume_time" TIMESTAMP(3),
ADD COLUMN     "total_duration_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_viewers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slide_timings" JSONB,
ADD COLUMN     "annotations" JSONB,
ADD COLUMN     "interaction_stats" JSONB,
ADD COLUMN     "recording_path" TEXT,
ADD COLUMN     "recording_size_mb" DECIMAL(10,2),
ALTER COLUMN "total_slides" SET DEFAULT 0,
ALTER COLUMN "session_name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "course_materials_course_id_is_active_idx" ON "course_materials"("course_id", "is_active");

-- CreateIndex
CREATE INDEX "course_materials_type_category_idx" ON "course_materials"("type", "category");

-- CreateIndex
CREATE INDEX "course_materials_created_by_created_at_idx" ON "course_materials"("created_by", "created_at");

-- CreateIndex
CREATE INDEX "course_materials_order_index_idx" ON "course_materials"("order_index");

-- CreateIndex
CREATE INDEX "course_materials_is_presentation_is_active_idx" ON "course_materials"("is_presentation", "is_active");

-- CreateIndex
CREATE INDEX "operation_logs_module_success_created_at_idx" ON "operation_logs"("module", "success", "created_at");

-- CreateIndex
CREATE INDEX "presentation_sessions_course_id_status_idx" ON "presentation_sessions"("course_id", "status");

-- CreateIndex
CREATE INDEX "presentation_sessions_teacher_id_created_at_idx" ON "presentation_sessions"("teacher_id", "created_at");

-- CreateIndex
CREATE INDEX "presentation_sessions_material_id_status_idx" ON "presentation_sessions"("material_id", "status");

-- CreateIndex
CREATE INDEX "presentation_sessions_classroom_id_start_time_idx" ON "presentation_sessions"("classroom_id", "start_time");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "student_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_file_upload_id_fkey" FOREIGN KEY ("file_upload_id") REFERENCES "file_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;