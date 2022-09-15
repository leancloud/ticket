import fs from 'fs';
import path from 'path';
import AV from 'leancloud-storage';
import { json2csvAsync } from 'json-2-csv';

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
      const readStream = fs.createReadStream(this.file);
      const file = new AV.File(path.parse(this.file).base, readStream);
      const res = await file.save({ useMasterKey: true });
      fs.unlink(this.file, (err) => {});
      return res.get('url');
    } catch (error) {
      console.error('[export ticket]: upload', error);
    }
  }

  async done() {
    this.complete();
    const url = await this.upload();
    return { url };
  }
}
