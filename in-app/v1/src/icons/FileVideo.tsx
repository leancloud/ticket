import * as React from 'react';

function FileVideoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#prefix__clip0)">
        <path
          d="M1.5 2.5A1.5 1.5 0 013 1h7.133a1.5 1.5 0 011.095.474l2.866 3.058a1.5 1.5 0 01.406 1.026V14.5A1.5 1.5 0 0113 16H3a1.5 1.5 0 01-1.5-1.5v-12z"
          stroke="currentColor"
        />
        <path
          d="M10.154 7.899a.696.696 0 010 1.202l-3.116 1.805A.692.692 0 016 10.304V6.696a.692.692 0 011.038-.602L10.154 7.9z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0">
          <path fill="#fff" transform="translate(0 .5)" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default FileVideoIcon;
