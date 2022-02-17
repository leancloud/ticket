import DOMPurify from 'dompurify';

export const sanitize = (dirty: string) => DOMPurify.sanitize(dirty);
