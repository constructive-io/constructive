import {S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  ContentStream,
  streamContentType} from '@constructive-io/content-type-stream';
import stream, { PassThrough, Readable } from 'stream';

export interface UploadParams {
  client: S3Client;
  key: string;
  contentType: string;
  bucket: string;
}

export interface AsyncUploadParams extends UploadParams {
  readStream: Readable;
  magic: { charset: string; type?: string };
}

export interface UploadWithFilenameParams {
  client: S3Client;
  readStream: Readable;
  filename: string;
  key: string;
  bucket: string;
}

export interface UploadWithContentTypeParams {
  client: S3Client;
  readStream: Readable;
  contentType: string;
  key: string;
  bucket: string;
  magic?: { charset: string; type?: string };
}

export interface UploadResult {
  Location: string;
  ETag?: string;
  Bucket?: string;
  Key?: string;
}

export interface AsyncUploadResult {
  upload: UploadResult;
  magic: { charset: string; type?: string };
  contentType: string;
  contents: unknown;
}

export const uploadFromStream = ({
  client,
  key,
  contentType,
  bucket
}: UploadParams): PassThrough => {
  const pass = new stream.PassThrough();

  const upload = new Upload({
    client,
    params: {
      Body: pass,
      Key: key,
      ContentType: contentType,
      Bucket: bucket
    },
  });

  upload.done()
    .then((data) => {
      // Transform to match v2 response format
      const result: UploadResult = {
        Location: data.Location || `https://${bucket}.s3.amazonaws.com/${key}`,
        ETag: data.ETag,
        Bucket: bucket,
        Key: key
      };
      pass.emit('upload', result);
    })
    .catch((err) => {
      pass.emit('error', err);
    });

  return pass;
};

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const asyncUpload = ({
  client,
  key,
  contentType,
  readStream,
  magic,
  bucket
}: AsyncUploadParams): Promise<AsyncUploadResult> => {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => {
        readStream.destroy();
        uploadStream.destroy();
        contentStream.destroy();
        reject(new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s for key=${key}`));
      });
    }, UPLOAD_TIMEOUT_MS);

    // upload stream
    let upload: UploadResult | undefined;

    const uploadStream = uploadFromStream({
      client,
      key,
      contentType,
      bucket
    });

    // content stream
    let contents: unknown;
    const contentStream = new ContentStream();

    const tryResolve = () => {
      if (contents && upload) {
        settle(() => {
          resolve({
            upload: upload!,
            magic,
            contentType,
            contents
          });
        });
      }
    };

    readStream.on('error', (error: Error) => {
      settle(() => {
        uploadStream.destroy();
        contentStream.destroy();
        reject(error);
      });
    });

    contentStream
      .on('contents', function (results: unknown) {
        contents = results;
        tryResolve();
      })
      .on('error', (error: Error) => {
        settle(() => {
          readStream.destroy();
          uploadStream.destroy();
          reject(error);
        });
      });

    uploadStream
      .on('upload', (results: UploadResult) => {
        upload = results;
        tryResolve();
      })
      .on('error', (error: Error) => {
        settle(() => {
          readStream.destroy();
          contentStream.destroy();
          reject(error);
        });
      });

    // Ensure proper cleanup on stream end
    uploadStream.on('finish', () => {
      readStream.destroy();
    });

    readStream.pipe(contentStream);
    contentStream.pipe(uploadStream);
  });
};

export const upload = async ({
  client,
  readStream,
  filename,
  key,
  bucket
}: UploadWithFilenameParams): Promise<AsyncUploadResult> => {
  const { stream: newStream, magic, contentType } = await streamContentType({
    readStream,
    filename
  });

  return await uploadWithContentType({
    client,
    readStream: newStream,
    contentType,
    magic,
    key,
    bucket
  });
};

export const uploadWithContentType = async ({
  client,
  readStream,
  contentType,
  key,
  bucket,
  magic
}: UploadWithContentTypeParams): Promise<AsyncUploadResult> => {
  return await asyncUpload({
    client,
    readStream,
    contentType,
    magic: magic ?? { charset: 'binary' },
    key,
    bucket,
  });
};
