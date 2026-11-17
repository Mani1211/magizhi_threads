import { useEffect } from 'react';

let locks = 0;

/** Stops the page behind a sheet or dialog from scrolling while it is open. */
export function useBodyLock() {
  useEffect(() => {
    locks++;
    document.body.style.overflow = 'hidden';
    return () => {
      locks--;
      if (locks === 0) document.body.style.overflow = '';
    };
  }, []);
}
