import { Context } from '@/ticket/automation';
import { not, string } from './common';

const getTicketTitle = (ctx: Context) => ctx.ticket.content;

const is = string.eq(getTicketTitle);
const isNot = not(is);

const includes = string.includes(getTicketTitle);
const notIncludes = not(includes);

const includesAny = string.includesAll(getTicketTitle);
const notIncludesAny = not(includesAny);

const includesAll = string.includesAll(getTicketTitle);
const notIncludesAll = not(includesAll);

export default {
  is,
  isNot,
  includes,
  notIncludes,
  includesAny,
  notIncludesAny,
  includesAll,
  notIncludesAll,
};
