import * as React from 'react';

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={17}
      height={15}
      viewBox="0 0 17 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.643 8.071l4.571 4.572 9.143-10.286"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CheckIcon;
