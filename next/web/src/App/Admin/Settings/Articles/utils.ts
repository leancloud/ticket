import { Article } from '@/api/article';

export function checkArticlePublished(article: Article) {
  const now = new Date();
  if (article.publishedFrom && new Date(article.publishedFrom) > now) {
    return false;
  }
  if (article.publishedTo && new Date(article.publishedTo) < now) {
    return false;
  }
  return true;
}
