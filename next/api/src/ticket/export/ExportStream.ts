import { PassThrough, Writable, Transform, TransformCallback } from 'node:stream';
import zlib from 'node:zlib';
import archiver from 'archiver';
import { json2csvAsync } from 'json-2-csv';
import { ExportTicketData } from './ExportTicket';

export class JsonTransform extends Transform {
  count = 0;
  lastChunk?: ExportTicketData;

  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: ExportTicketData, encoding: BufferEncoding, callback: TransformCallback) {
    const json = JSON.stringify(chunk.data);
    if (this.count) {
      callback(null, ',' + json);
    } else {
      callback(null, '[' + json);
    }
    this.count += 1;
    this.lastChunk = chunk;
  }

  _final(callback: (error?: Error | null | undefined) => void): void {
    this.emit('data', ']');
    super._final(callback);
  }
}

export class CsvTransform extends Transform {
  count = 0;
  lastChunk?: ExportTicketData;

  constructor() {
    super({ objectMode: true });
  }

  async _transform(chunk: ExportTicketData, encoding: string, callback: TransformCallback) {
    const row = await json2csvAsync([chunk.data], {
      keys: chunk.keys,
      prependHeader: false,
      emptyFieldValue: '',
    });
    if (this.count) {
      callback(null, '\n' + row);
    } else {
      callback(null, row);
    }
    this.count += 1;
    this.lastChunk = chunk;
  }
}

export function createCompressStream(output: Writable, filename: string) {
  const archive = archiver('zip', {
    zlib: {
      level: zlib.constants.Z_BEST_COMPRESSION,
    },
  });
  archive.pipe(output);
  const input = new PassThrough();
  archive.append(input, { name: filename });
  input.on('finish', () => archive.finalize());
  return input;
}
