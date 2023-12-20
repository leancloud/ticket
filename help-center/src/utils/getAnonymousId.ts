import { customAlphabet } from 'nanoid';

const KEY = 'VISITOR_ID';
const AlPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const getAnonymousId = async ({
  from,
  productId,
}: {
  from?: string | null;
  productId: string;
}) => {
  let uniqueId = localStorage.getItem(KEY);

  if (!uniqueId) {
    uniqueId = customAlphabet(AlPHABET, 32)();
    localStorage.setItem(KEY, uniqueId);
  }

  const id = `${from || 'unknown'}-${productId}-${uniqueId}`;

  return id;
};
