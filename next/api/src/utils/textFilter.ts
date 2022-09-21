import axios from 'axios';
import { createHash } from 'node:crypto';

type FilterText = (
  input: string,
  filterOptions: {
    requestOptions: {
      user_id: string;
      nickname?: string;
      ip?: string;
    };
    escape?: boolean;
  }
) => Promise<string>;

export const filterText: FilterText = async (input, { escape = true, requestOptions }) => {
  if (!input) return input;

  const {
    TDS_TEXT_FILTER_HOST,
    TDS_TEXT_FILTER_SCENE,
    TDS_CLIENT_ID,
    TDS_SERVER_SECRET,
  } = process.env;

  const hash = createHash('sha1');
  hash.update(input);
  const res = await axios.post<{
    hint: { hit_words: { positions: { start_index: number; end_index: number } }[] };
  }>(
    `${TDS_TEXT_FILTER_HOST as string}/v2/text/check`,
    {
      scene: TDS_TEXT_FILTER_SCENE as string,
      data: {
        ...requestOptions,
        user_id: `ticket-${requestOptions.user_id}`,
        text: input,
        data_id: hash.digest('hex'),
      },
    },
    {
      headers: {
        'X-Client-ID': TDS_CLIENT_ID as string,
        'X-Server-Secret': TDS_SERVER_SECRET as string,
        'Content-Type': 'application/json',
      },
    }
  );
  const [filteredText, lastEnd] = res.data.hint.hit_words.reduce<[string, number]>(
    ([res, lastEnd], { positions: { start_index, end_index } }) => [
      `${res}${input.slice(lastEnd, start_index)}${(escape ? '\\*' : '*').repeat(
        end_index - start_index
      )}`,
      end_index,
    ],
    ['', 0]
  );
  return filteredText + input.slice(lastEnd);
};
