import classNames from 'classnames';
import moment, { Moment } from 'moment';

export function DateTime({
  value,
  href,
  className,
}: {
  value: string | Date | Moment;
  href?: string;
  className?: string;
}) {
  if (!moment.isMoment(value)) {
    value = moment(value);
  }
  const diff = moment().diff(value);
  const diffDays = moment().dayOfYear() - value.dayOfYear();
  const sameYear = moment().year() === value.year();

  const display =
    diff < 3600000 * 21.5
      ? value.fromNow()
      : diffDays === 1
      ? value.calendar()
      : sameYear
      ? value.format('MM-DD LT')
      : value.format('lll');
  const Component = href ? 'a' : 'span';
  return (
    <Component
      className={classNames('timestamp', className)}
      href={href}
      title={value.format('llll')}
    >
      {display}
    </Component>
  );
}
