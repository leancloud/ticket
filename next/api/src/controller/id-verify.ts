import { Controller, HttpError, Post, Query, UseMiddlewares } from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import axios from 'axios';
import NodeRSA from 'node-rsa';

const CLIENT_ID = process.env.ID_VERIFY_APP_CLIENT_ID;
const PUBLIC_KEY = process.env.ID_VERIFY_PUBLIC_KEY;

const publicKey = PUBLIC_KEY ? new NodeRSA(PUBLIC_KEY) : null;
publicKey?.setOptions({
  encryptionScheme: 'pkcs1',
});
const encrypt = (value: string) => publicKey?.encrypt(value, 'base64');

@Controller('id-verify')
@UseMiddlewares(auth, customerServiceOnly)
export class IDVerifyController {
  @Post()
  async verify(@Query('id') id?: string, @Query('name') name?: string) {
    if (!publicKey) {
      throw new HttpError(400, `ID verify is not enabled`);
    }
    if (!CLIENT_ID) {
      throw new HttpError(400, `ID_VERIFY_APP_CLIENT_ID not configuared`);
    }
    if (!id) {
      throw new HttpError(400, `id is required`, 'MISSING_PARAMETER');
    }
    if (!id) {
      throw new HttpError(400, `name is required`, 'MISSING_PARAMETER');
    }
    const response = await axios.post(
      `https://tds-tapsdk.cn.tapapis.com/real-name/v1/clients/${CLIENT_ID}/users/${id}/manual`,
      {
        data: encrypt(
          JSON.stringify({
            name,
            idCard: id,
          })
        ),
      },
      {
        validateStatus: (status) => status < 500,
      }
    );
    const {
      data: { success, data },
      status,
    } = response;
    if (success) return data;
    throw new HttpError(status, data.error_description, data.msg);
  }
}
