import * as React from 'react';

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={17}
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.065 11.505l6.011-6.01M11.076 11.505l-6.01-6.01"
      />
    </svg>
  );
}

export default XIcon;
