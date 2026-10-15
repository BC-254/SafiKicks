import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout (SEC-01 / M13-07)

export function useInactivityLogout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await logout();
        navigate('/login?reason=inactivity');
      }, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    resetTimer(); // start initial timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [isAuthenticated, logout, navigate, timeoutMs]);
}
