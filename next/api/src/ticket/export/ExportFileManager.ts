import fs from 'node:fs';
import p_fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import AV from 'leancloud-storage';
import { json2csvAsync } from 'json-2-csv';

const p_exec = promisify(exec);

const IN_MEMORY = process.env.TICKET_EXPORT_IN_MEMORY;

type fileExtension = '.json' | '.csv';

export class ExportFileManager {
  tmpDir = `${__dirname}/tmp`;
  private file: string | undefined;
  private ext: fileExtension | undefined;
  private isFirst: boolean;
  constructor(fileName: string) {
    this.createFile(fileName);
    this.isFirst = true;
  }

  private createFile(fileName: string) {
    const file = path.join(this.tmpDir, fileName);
    const res = path.parse(file);
    if (res.ext !== '.json' && res.ext !== '.csv') {
      throw Error(`[export ticket]: Invalid file extension, one of ['csv','json']`);
    }
    if (res.dir !== this.tmpDir) {
      throw Error(`[export ticket]: Invalid filename`);
    }
    let stats: fs.Stats | undefined;
    try {
      stats = fs.statSync(file);
    } catch (error) {
      if (stats && stats.isFile()) {
        console.log(`${res.name} is exists`);
      } else {
        try {
          if (!fs.statSync(this.tmpDir).isDirectory()) {
            fs.readdirSync(this.tmpDir);
          }
        } catch (err: any) {
          if (err && err.code === 'ENOENT') {
            fs.mkdirSync(this.tmpDir);
          } else {
            throw err;
          }
        }
      }
    }
    this.ext = res.ext;
    fs.writeFileSync(file, '');
    this.file = file;
  }

  private appendData(data: string | Uint8Array) {
    if (!this.file) {
      throw Error('export file not exists');
    }
    fs.appendFileSync(this.file, data, {
      flag: 'a',
    });
  }

  private prepend() {
    if (!this.file || !this.ext) {
      return;
    }
    if (this.ext === '.json') {
      this.appendData('[');
    }
  }

  private complete() {
    if (!this.file || !this.ext) {
      return;
    }
    if (this.ext === '.json') {
      this.appendData(']');
    }
  }

  async append(data: Record<string, any>) {
    let prependHeader = false;
    let jsonSep = ',';
    if (this.isFirst) {
      this.prepend();
      this.isFirst = false;
      jsonSep = '';
      prependHeader = true;
    }
    try {
      if (this.ext === '.json') {
        this.appendData(`${jsonSep}${JSON.stringify(data)}`);
      }
      if (this.ext === '.csv') {
        const csvData = await json2csvAsync([data], {
          prependHeader,
          emptyFieldValue: '',
        });
        this.appendData(csvData + '\n');
      }
    } catch (error) {
      console.error('[export ticket]: append data', (error as Error).message);
    }
  }

  async upload() {
    if (!this.file) {
      return;
    }
    try {
      let filename: string;
      let fileData: any;

      if (IN_MEMORY) {
        const archivePath = this.file + '.tar.gz';
        await p_exec(`tar -czf ${archivePath} ${this.file}`);
        filename = path.parse(archivePath).base;
        fileData = await p_fs.readFile(archivePath);
      } else {
        filename = path.parse(this.file).base;
        fileData = fs.createReadStream(this.file);
      }

      const file = new AV.File(filename, fileData);
      await file.save({ useMasterKey: true });
      return file.get('url');
    } catch (error) {
      console.error('[export ticket]: upload', error);
    } finally {
      fs.unlinkSync(this.file);
    }
  }

  async done() {
    this.complete();
    const url = await this.upload();
    return { url };
  }
}
