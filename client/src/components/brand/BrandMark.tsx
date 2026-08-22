export function BrandMark() {
  return (
    <div className="brand-lockup" aria-label="Sports Team Management">
      <span className="brand-mark" aria-hidden="true">
        <svg width="27" height="27" viewBox="0 0 27 27" fill="none">
          <path
            d="M4 7.2 13.5 2 23 7.2v12.6L13.5 25 4 19.8V7.2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m8 16 3.2-5.1 3.1 3.5L19 9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>Sports Team Management</span>
    </div>
  );
}
