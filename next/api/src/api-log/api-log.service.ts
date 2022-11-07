import { ApiLog } from './types';

class ApiLogService {
  write(apiLog: ApiLog) {
    console.log(JSON.stringify(apiLog));
  }
}

export default new ApiLogService();
