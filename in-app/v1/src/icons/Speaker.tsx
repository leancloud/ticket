import { SVGProps } from 'react';

const SpeakerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={21}
    viewBox="0 0 20 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9.059 5.098 6.684 7.473a1 1 0 0 1-.708.293H4.75c-.69 0-1.25.56-1.25 1.25v2.968c0 .69.56 1.25 1.25 1.25h1.226a1 1 0 0 1 .708.293l2.375 2.375c.63.63 1.707.184 1.707-.707v-9.39c0-.891-1.078-1.337-1.707-.707ZM12.875 8.293c.566.566.916 1.347.916 2.21 0 .864-.35 1.646-.916 2.211M14.662 6.543a5.607 5.607 0 0 1 1.63 3.96 5.607 5.607 0 0 1-1.63 3.959"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default SpeakerIcon;
