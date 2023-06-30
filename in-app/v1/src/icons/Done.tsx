import { SVGProps } from 'react';

export const DoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="8.0001" cy="8.0001" r="6.4" fill="#15C5CE" />
    <path
      d="M5.3335 7.66667L7.3335 9.66667L10.6668 6"
      stroke="white"
      strokeWidth="1.33333"
      strokeLinecap="round"
    />
  </svg>
);
