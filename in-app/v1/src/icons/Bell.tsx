import React from 'react';

export default (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.5 9C6.5 6.51472 8.51472 4.5 11 4.5V4.5C13.4853 4.5 15.5 6.51472 15.5 9V13.3962C15.5 13.4756 15.5236 13.5531 15.5678 13.619L17.2912 16.1886C17.3803 16.3215 17.285 16.5 17.125 16.5H4.87495C4.71496 16.5 4.61973 16.3215 4.70885 16.1886L6.43221 13.619C6.47641 13.5531 6.5 13.4756 6.5 13.3962V9Z"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M11 3V4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 19H12.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
