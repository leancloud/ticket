import DOMPurify from 'isomorphic-dompurify';

export const sanitize = (dirty: string) => DOMPurify.sanitize(dirty);
