import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptSegment } from './entities/transcript-segment.entity';
import { RecordingStorageService } from './recording-storage.service';
import { TranslationService } from './translation.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([TranscriptSegment])],
  providers: [RecordingStorageService, TranslationService],
  exports: [RecordingStorageService, TranslationService, TypeOrmModule],
})
export class MediaModule {}
