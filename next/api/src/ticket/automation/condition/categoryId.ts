import { Context } from '@/ticket/automation';
import { not, string } from './common';

function getCategoryId({ ticket, updatedData }: Context): string {
  return updatedData?.categoryId ?? ticket.categoryId;
}

const is = string.eq(getCategoryId);
const isNot = not(is);

export default {
  is,
  isNot,
};
