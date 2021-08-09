import * as React from 'react';

function ClipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.59 5.538L6.349 9.78a1.5 1.5 0 000 2.122v0a1.5 1.5 0 002.122 0l4.242-4.243a3 3 0 000-4.243v0a3 3 0 00-4.242 0L4.226 7.66a4.5 4.5 0 000 6.364v0a4.5 4.5 0 006.364 0l4.596-4.596"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ClipIcon;
