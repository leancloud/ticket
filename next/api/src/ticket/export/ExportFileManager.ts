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

const bomHeader = Buffer.from([0xef, 0xbb, 0xbf]);

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

  /**
   * CAUTION: Very expansive
   */
  async prepend(data: string | Buffer, linebreak = true) {
    return new Promise((resolve, reject) => {
      const filePath = this.file;
      if (!filePath) {
        throw Error('export file not exists');
      }
      const tempFilePath = path.join(__dirname, `/tmp/temp_for_prepend_${Date.now().toString()}`);
      const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const writeStream = fs.createWriteStream(tempFilePath, { encoding: 'utf8' });
      writeStream.write(data);
      if (linebreak) {
        writeStream.write('\n');
      }
      readStream.on('data', (chunk) => {
        writeStream.write(chunk);
      });
      readStream.on('end', () => {
        fs.renameSync(tempFilePath, filePath);
        resolve(undefined);
      });
      readStream.on('error', reject);
      writeStream.on('error', reject);
    });
  }

  private prepare() {
    if (!this.file || !this.ext) {
      return;
    }
    if (this.ext === '.json') {
      this.appendData('[');
    }
  }

  private async complete() {
    if (!this.file || !this.ext) {
      return;
    }
    if (this.ext === '.json') {
      this.appendData(']');
    }
    if (this.ext === '.csv') {
      await this.prepend(bomHeader, false);
    }
  }

  async append(data: Record<string, any>, keys: string[]) {
    let jsonSep = ',';
    if (this.isFirst) {
      this.prepare();
      this.isFirst = false;
      jsonSep = '';
    }
    try {
      if (this.ext === '.json') {
        this.appendData(`${jsonSep}${JSON.stringify(data)}`);
      }
      if (this.ext === '.csv') {
        const csvData = await json2csvAsync([data], {
          keys,
          prependHeader: false,
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
      console.log('start to upload');
      let filename: string;
      let fileData: any;

      if (IN_MEMORY) {
        filename = path.parse(this.file).base;
        await p_exec(`tar -czf ${filename + '.tar.gz'} ${filename}`, {
          cwd: this.tmpDir,
        });
        filename += '.tar.gz';
        fileData = await p_fs.readFile(path.join(this.tmpDir, filename));
      } else {
        filename = path.parse(this.file).base;
        fileData = fs.createReadStream(this.file);
      }

      const file = new AV.File(filename, fileData);
      await file.save({ useMasterKey: true });
      console.log('file uploaded', file.id, file.url());
      return file.get('url');
    } catch (error) {
      console.error('[export ticket]: upload', error);
    } finally {
      console.log('remove exported ticket file');
      fs.unlinkSync(this.file);
    }
  }

  async done() {
    await this.complete();
    const url = await this.upload();
    return { url };
  }
}
