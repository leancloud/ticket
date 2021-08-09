import * as React from 'react';

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.5 12.833a1 1 0 102 0V9.5h3.334a1 1 0 000-2H9.5V4.167a1 1 0 10-2 0V7.5H4.167a1 1 0 100 2H7.5v3.333z"
        fill="currentColor"
      />
    </svg>
  );
}

export default PlusIcon;
