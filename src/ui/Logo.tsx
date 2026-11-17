/** The Magizhi mark: two needles and a thread forming an M, in gold on teal. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 48 48" aria-hidden="true">
      <circle className="disc" cx="24" cy="24" r="23" />
      <circle className="ring" cx="24" cy="24" r="22.4" />
      <circle className="stitch" cx="24" cy="24" r="19.6" />
      <path className="gold" strokeWidth="1.3" d="M12.5 31c-.6-9.5 3.4-14.6 6.6-12.4 2.4 1.7 2.6 6.6 4.9 6.6s2.5-4.9 4.9-6.6c3.2-2.2 7.2 2.9 6.6 12.4" />
      <path className="gold" strokeWidth="1.9" d="M15.2 14.6 26.4 34.2M32.8 14.6 21.6 34.2" />
      <ellipse className="gold" strokeWidth="1.1" cx="14.6" cy="13.5" rx="1" ry="1.9" transform="rotate(-30 14.6 13.5)" />
      <ellipse className="gold" strokeWidth="1.1" cx="33.4" cy="13.5" rx="1" ry="1.9" transform="rotate(30 33.4 13.5)" />
    </svg>
  );
}
