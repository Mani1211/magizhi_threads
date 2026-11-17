import { Logo } from './Logo';

export function Splash({ text = 'Loading…' }: { text?: string }) {
  return <div className="splash" role="status"><Logo /><span>{text}</span></div>;
}
