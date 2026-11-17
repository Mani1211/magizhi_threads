import type { SVGProps } from 'react';

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const PlusIcon = () => <svg {...base(18)} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>;
export const SearchIcon = () => <svg {...base(18)} strokeWidth={2}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const BackIcon = () => <svg {...base(18)} strokeWidth={2.2}><path d="M15 18l-6-6 6-6" /></svg>;
export const EditIcon = () => <svg {...base(16)} strokeWidth={2}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
export const TrashIcon = () => <svg {...base(16)} strokeWidth={2}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const ImageIcon = () => <svg {...base(20)} strokeWidth={1.9}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 8" /></svg>;
export const CloseIcon = () => <svg {...base(16)} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const PrevIcon = () => <svg {...base(20)} strokeWidth={2.2}><path d="M15 18l-6-6 6-6" /></svg>;
export const NextIcon = () => <svg {...base(20)} strokeWidth={2.2}><path d="M9 6l6 6-6 6" /></svg>;
export const SignOutIcon = () => <svg {...base(16)} strokeWidth={2}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>;
