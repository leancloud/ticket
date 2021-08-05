import * as React from 'react';

function ThumbUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.178 5.956h-.491c-.904 0-1.637.733-1.637 1.637v4.837c0 .904.733 1.636 1.637 1.636h.491v-8.11zM5.378 4.652v9.414h4.964c1.237 0 2.313-.85 2.6-2.054l.943-3.96a1.982 1.982 0 00-1.928-2.441H9.194c.147-.272.305-.577.441-.888.16-.364.305-.772.353-1.159.048-.377.017-.867-.349-1.233a1.31 1.31 0 00-.87-.395 1.737 1.737 0 00-.857.2c-.496.246-.985.694-1.422 1.167-.382.412-.763.888-1.112 1.349z"
        fill="currentColor"
      />
    </svg>
  );
}

export default ThumbUp;
