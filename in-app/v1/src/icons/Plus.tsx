import * as React from 'react';

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="30"
      height="31"
      viewBox="0 0 30 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect y="14.5" width="30" height="2" rx="1" fill="#B9BEC1" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 0.5C15.5523 0.5 16 0.947715 16 1.5L16 29.5C16 30.0523 15.5523 30.5 15 30.5C14.4477 30.5 14 30.0523 14 29.5L14 1.5C14 0.947716 14.4477 0.5 15 0.5Z"
        fill="#B9BEC1"
      />
    </svg>
  );
}

export default PlusIcon;
