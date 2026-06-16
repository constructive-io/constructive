/* eslint-disable @typescript-eslint/no-require-imports */
const JSDOMEnvironment = require('jest-environment-jsdom').default;
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { TextEncoder, TextDecoder } = require('node:util');

class WebJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    Object.assign(this.global, {
      TextEncoder,
      TextDecoder,
      ReadableStream,
      TransformStream,
      WritableStream,
      fetch,
      Response,
      Request,
      Headers,
      FormData,
      Blob,
      AbortController,
      AbortSignal,
    });
  }
}

module.exports = WebJSDOMEnvironment;
