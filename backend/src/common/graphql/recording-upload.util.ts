import { BadRequestException } from '@nestjs/common';
import { JsonObject, omitKeys } from './graphql-dto.util';
import { UploadedRecordingFile } from '../../features/media/recording-storage.service';

const RECORDING_UPLOAD_KEYS = [
  'recordingBase64',
  'blobBase64',
  'fileBase64',
  'fileName',
];

export function getRecordingDtoInput(value?: JsonObject | null) {
  return omitKeys(value, RECORDING_UPLOAD_KEYS);
}

export function getRecordingFileInput(
  value?: JsonObject | null,
): UploadedRecordingFile | null {
  const input = value ?? {};
  const raw =
    input.recordingBase64 ?? input.blobBase64 ?? input.fileBase64 ?? null;

  if (raw == null || raw === '') {
    return null;
  }

  if (typeof raw !== 'string') {
    throw new BadRequestException('Recording upload must be a base64 string.');
  }

  const { base64, mimeType: dataUrlMimeType } = splitBase64Payload(raw);
  const buffer = Buffer.from(base64, 'base64');

  if (!buffer.length) {
    throw new BadRequestException('Recording file is empty.');
  }

  return {
    buffer,
    mimetype:
      (typeof input.mimeType === 'string' && input.mimeType) ||
      dataUrlMimeType ||
      undefined,
    originalname:
      typeof input.fileName === 'string' && input.fileName
        ? input.fileName
        : undefined,
    size: buffer.length,
  };
}

function splitBase64Payload(value: string) {
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(value);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64: dataUrlMatch[2],
    };
  }

  return {
    mimeType: null,
    base64: value,
  };
}
