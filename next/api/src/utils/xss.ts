import DOMPurify from 'isomorphic-dompurify';

export const sanitize = (dirty: string) =>
  DOMPurify.sanitize(dirty, { FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] });
