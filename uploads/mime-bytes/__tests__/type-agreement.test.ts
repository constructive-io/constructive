import { createReadStream } from 'fs';
import path from 'path';

import { FileTypeDetector } from '../src/file-type-detector';
import { checkTypeAgreement, mimeTypeForFilename, mimeTypesAgree } from '../src/type-agreement';

describe('mimeTypeForFilename', () => {
  test('reads the extension, not the name', () => {
    expect(mimeTypeForFilename('holiday.photo.jpg')).toBe('image/jpeg');
    expect(mimeTypeForFilename('report.pdf')).toBe('application/pdf');
  });

  test('claims nothing without an extension', () => {
    expect(mimeTypeForFilename('LICENSE')).toBeNull();
    expect(mimeTypeForFilename('')).toBeNull();
    expect(mimeTypeForFilename(null)).toBeNull();
  });
});

describe('mimeTypesAgree', () => {
  test('silence agrees with everything', () => {
    expect(mimeTypesAgree(null, 'image/png')).toBe(true);
    expect(mimeTypesAgree('application/octet-stream', 'image/png')).toBe(true);
  });

  test('aliases of one type are that type', () => {
    expect(mimeTypesAgree('image/jpg', 'image/jpeg')).toBe(true);
    expect(mimeTypesAgree('text/xml', 'application/xml')).toBe(true);
  });

  test('text is one family, because leading bytes cannot split it', () => {
    expect(mimeTypesAgree('text/csv', 'text/plain')).toBe(true);
    expect(mimeTypesAgree('application/json', 'text/plain')).toBe(true);
    expect(mimeTypesAgree('image/svg+xml', 'text/plain')).toBe(true);
  });

  test('a container agrees with what it contains', () => {
    expect(
      mimeTypesAgree(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
      ),
    ).toBe(true);
    expect(mimeTypesAgree('audio/mp4', 'video/mp4')).toBe(true);
  });

  test('different kinds of file disagree', () => {
    expect(mimeTypesAgree('image/jpeg', 'text/html')).toBe(false);
    expect(mimeTypesAgree('image/jpeg', 'image/png')).toBe(false);
    expect(mimeTypesAgree('application/pdf', 'application/zip')).toBe(false);
  });
});

describe('checkTypeAgreement', () => {
  test('accepts a file that is what it says it is', () => {
    expect(
      checkTypeAgreement({
        filename: 'avatar.png',
        declaredMime: 'image/png',
        detectedMime: 'image/png',
      }),
    ).toEqual({ ok: true });
  });

  test('rejects an extension that lies about the bytes', () => {
    const result = checkTypeAgreement({
      filename: 'avatar.jpg',
      declaredMime: 'image/jpeg',
      detectedMime: 'text/html',
    });
    expect(result.ok).toBe(false);
    expect(result.violation?.code).toBe('EXTENSION_BYTES_MISMATCH');
    expect(result.violation?.message).toContain('image/jpeg');
    expect(result.violation?.message).toContain('text/html');
  });

  test('rejects a declared type that lies about the bytes', () => {
    const result = checkTypeAgreement({
      filename: 'notes',
      declaredMime: 'image/png',
      detectedMime: 'application/pdf',
    });
    expect(result.ok).toBe(false);
    expect(result.violation?.code).toBe('DECLARED_BYTES_MISMATCH');
  });

  test('rejects a declared type that contradicts the extension, with no bytes seen', () => {
    const result = checkTypeAgreement({
      filename: 'invoice.pdf',
      declaredMime: 'image/png',
    });
    expect(result.ok).toBe(false);
    expect(result.violation?.code).toBe('DECLARED_EXTENSION_MISMATCH');
  });

  test('passes an upload whose bytes have not been seen and whose claims agree', () => {
    expect(checkTypeAgreement({ filename: 'invoice.pdf', declaredMime: 'application/pdf' }).ok).toBe(true);
  });

  test('does not reject an extension it has never heard of', () => {
    expect(checkTypeAgreement({ filename: 'model.myformat', detectedMime: 'application/pdf' }).ok).toBe(true);
  });

  test('rejects the html-as-jpg fixture, detecting from its actual bytes', async () => {
    const fixture = path.join(__dirname, '../../../__fixtures__/malicious/html-as-jpg.jpg');
    const detector = new FileTypeDetector();
    const detected = await detector.detectWithFallback(createReadStream(fixture), 'html-as-jpg.jpg');

    const result = checkTypeAgreement({
      filename: 'html-as-jpg.jpg',
      declaredMime: 'image/jpeg',
      detectedMime: detected?.mimeType,
    });

    expect(result.ok).toBe(false);
    expect(result.violation?.code).toBe('EXTENSION_BYTES_MISMATCH');
  });
});
