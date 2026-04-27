import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRealtimeCommunication1710800000000
  implements MigrationInterface
{
  name = 'CreateRealtimeCommunication1710800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_sessions_type_enum') THEN
          CREATE TYPE "call_sessions_type_enum" AS ENUM ('voice', 'video');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_sessions_status_enum') THEN
          CREATE TYPE "call_sessions_status_enum" AS ENUM ('ringing', 'connecting', 'active', 'ended', 'missed', 'rejected', 'failed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_participants_role_enum') THEN
          CREATE TYPE "call_participants_role_enum" AS ENUM ('caller', 'receiver');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transcript_segments_sessionType_enum') THEN
          CREATE TYPE "transcript_segments_sessionType_enum" AS ENUM ('call', 'meeting');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transcript_segments_translationStatus_enum') THEN
          CREATE TYPE "transcript_segments_translationStatus_enum" AS ENUM ('not_requested', 'translated', 'disabled', 'failed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meetings_state_enum') THEN
          CREATE TYPE "meetings_state_enum" AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_participants_role_enum') THEN
          CREATE TYPE "meeting_participants_role_enum" AS ENUM ('host', 'invitee');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_participants_status_enum') THEN
          CREATE TYPE "meeting_participants_status_enum" AS ENUM ('invited', 'accepted', 'declined', 'joined', 'left');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "call_sessions_type_enum" NOT NULL,
        "status" "call_sessions_status_enum" NOT NULL DEFAULT 'ringing',
        "callerId" uuid NOT NULL,
        "receiverId" uuid NOT NULL,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "endedReason" character varying(120),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_call_sessions_caller" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_call_sessions_receiver" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "callId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "call_participants_role_enum" NOT NULL,
        "joinedAt" TIMESTAMP WITH TIME ZONE,
        "leftAt" TIMESTAMP WITH TIME ZONE,
        "microphoneMuted" boolean NOT NULL DEFAULT false,
        "cameraEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_participants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_call_participants_call_user" UNIQUE ("callId", "userId"),
        CONSTRAINT "FK_call_participants_call" FOREIGN KEY ("callId") REFERENCES "call_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_call_participants_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_recordings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "callId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "recordingPath" character varying(500),
        "mimeType" character varying(120),
        "sizeBytes" integer NOT NULL DEFAULT 0,
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_recordings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_call_recordings_call" FOREIGN KEY ("callId") REFERENCES "call_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_call_recordings_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transcript_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionType" "transcript_segments_sessionType_enum" NOT NULL,
        "sessionId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "text" character varying(400) NOT NULL,
        "sourceLanguage" character varying(16),
        "targetLanguage" character varying(16),
        "translatedText" character varying(400),
        "translationStatus" "transcript_segments_translationStatus_enum" NOT NULL DEFAULT 'not_requested',
        "translationProvider" character varying(80),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transcript_segments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transcript_segments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meetings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(160) NOT NULL,
        "agenda" character varying(4000),
        "scheduledStartAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "durationMinutes" integer NOT NULL,
        "state" "meetings_state_enum" NOT NULL DEFAULT 'scheduled',
        "hostId" uuid NOT NULL,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meetings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meetings_host" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meeting_participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "meetingId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "meeting_participants_role_enum" NOT NULL,
        "status" "meeting_participants_status_enum" NOT NULL DEFAULT 'invited',
        "invitedById" uuid NOT NULL,
        "joinedAt" TIMESTAMP WITH TIME ZONE,
        "leftAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_participants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_meeting_participants_meeting_user" UNIQUE ("meetingId", "userId"),
        CONSTRAINT "FK_meeting_participants_meeting" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_meeting_participants_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_meeting_participants_inviter" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meeting_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "meetingId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "content" character varying(4000) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_notes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meeting_notes_meeting" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_meeting_notes_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meeting_recordings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "meetingId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "recordingPath" character varying(500),
        "mimeType" character varying(120),
        "sizeBytes" integer NOT NULL DEFAULT 0,
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_recordings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meeting_recordings_meeting" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_meeting_recordings_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_call_sessions_caller_created" ON "call_sessions" ("callerId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_call_sessions_receiver_created" ON "call_sessions" ("receiverId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_call_recordings_call_created" ON "call_recordings" ("callId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transcript_segments_session_created" ON "transcript_segments" ("sessionType", "sessionId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_meetings_scheduled" ON "meetings" ("scheduledStartAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_meetings_host_created" ON "meetings" ("hostId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_meeting_notes_meeting_created" ON "meeting_notes" ("meetingId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_meeting_recordings_meeting_created" ON "meeting_recordings" ("meetingId", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting_recordings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting_notes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting_participants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meetings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transcript_segments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "call_recordings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "call_participants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "call_sessions" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meeting_participants_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meeting_participants_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meetings_state_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transcript_segments_translationStatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transcript_segments_sessionType_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_participants_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_sessions_type_enum"`);
  }
}
