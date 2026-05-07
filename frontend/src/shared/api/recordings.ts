const RECORDING_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const SUPPORTED_RECORDING_MIME_TYPES = new Set(
  Object.keys(RECORDING_EXTENSION_BY_MIME_TYPE),
);

const MAX_RECORDING_UPLOAD_BYTES = 250 * 1024 * 1024;

interface RecordingUploadPayload {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  mimeType?: string;
  blob?: Blob;
}

export function createRecordingUploadFormData(
  prefix: string,
  payload: RecordingUploadPayload,
) {
  if (!payload.blob) {
    throw new Error('Recording file is missing.');
  }

  if (!payload.blob.size) {
    throw new Error('Recording did not capture audio or video.');
  }

  if (payload.blob.size > MAX_RECORDING_UPLOAD_BYTES) {
    throw new Error('Recording file is too large.');
  }

  const mimeType = (payload.mimeType || payload.blob.type || '').toLowerCase();

  if (!mimeType || !SUPPORTED_RECORDING_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported recording file type.');
  }

  const formData = new FormData();
  formData.set('startedAt', payload.startedAt);
  formData.set('endedAt', payload.endedAt);
  formData.set('durationSeconds', String(payload.durationSeconds));
  formData.set('mimeType', mimeType);
  formData.set(
    'recording',
    payload.blob,
    `${prefix}${RECORDING_EXTENSION_BY_MIME_TYPE[mimeType] ?? '.webm'}`,
  );

  return formData;
}
