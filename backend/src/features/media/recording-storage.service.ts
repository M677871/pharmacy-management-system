import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface UploadedRecordingFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

const MIME_EXTENSION: Record<string, string> = {
  'audio/webm': '.webm',
  'video/webm': '.webm',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'audio/ogg': '.ogg',
};

@Injectable()
export class RecordingStorageService {
  private readonly baseDirectory: string;

  constructor(private readonly configService: ConfigService) {
    this.baseDirectory = path.resolve(
      this.configService.get<string>(
        'RECORDINGS_STORAGE_DIR',
        path.join(process.cwd(), 'storage', 'recordings'),
      ),
    );
  }

  async saveRecording(prefix: string, file?: UploadedRecordingFile | null) {
    if (!file) {
      return null;
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Recording file is empty.');
    }

    const maxBytes = this.configService.get<number>(
      'MAX_RECORDING_UPLOAD_BYTES',
      250 * 1024 * 1024,
    );

    if ((file.size ?? file.buffer.length) > maxBytes) {
      throw new BadRequestException('Recording file is too large.');
    }

    const extension = this.resolveExtension(file.mimetype);
    const safePrefix = prefix
      .split(/[\\/]+/)
      .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
      .filter(Boolean)
      .join(path.sep);
    const relativePath = path.join(safePrefix, `${randomUUID()}${extension}`);
    const absolutePath = this.resolvePrivatePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return relativePath.replace(/\\/g, '/');
  }

  async assertExists(relativePath: string) {
    const absolutePath = this.resolvePrivatePath(relativePath);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Recording file not found.');
    }

    return absolutePath;
  }

  createReadStream(relativePath: string) {
    const absolutePath = this.resolvePrivatePath(relativePath);
    return fs.createReadStream(absolutePath);
  }

  private resolvePrivatePath(relativePath: string) {
    const absolutePath = path.resolve(this.baseDirectory, relativePath);

    if (
      absolutePath !== this.baseDirectory &&
      !absolutePath.startsWith(`${this.baseDirectory}${path.sep}`)
    ) {
      throw new BadRequestException('Invalid recording path.');
    }

    return absolutePath;
  }

  private resolveExtension(mimeType?: string) {
    if (!mimeType) {
      return '.webm';
    }

    return MIME_EXTENSION[mimeType.toLowerCase()] ?? '.webm';
  }
}
