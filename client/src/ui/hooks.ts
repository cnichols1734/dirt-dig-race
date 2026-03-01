import { useState, useEffect } from 'react';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => checkMobile());
  useEffect(() => {
    const handler = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function checkMobile(): boolean {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isNarrow = window.innerWidth < 768;
  return hasTouch || isNarrow;
}
