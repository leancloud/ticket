import { ArticleRevisionFeedbackSummary } from '@/api/article-revision';
import { BsHandThumbsUp, BsHandThumbsDown } from 'react-icons/bs';

export function FeedbackSummary({ revision }: { revision: ArticleRevisionFeedbackSummary }) {
  return (
    <span>
      {revision.upvote !== undefined && (
        <span className="text-success">
          <BsHandThumbsUp className="inline-block mr-1" />
          {revision.upvote}
        </span>
      )}
      {revision.downvote !== undefined && (
        <span className="ml-2 text-danger">
          <BsHandThumbsDown className="inline-block mr-1" />
          {revision.downvote}
        </span>
      )}
    </span>
  );
}
