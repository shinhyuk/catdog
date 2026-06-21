import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from './geo';

// 브라우저 위치/방향 센서 접근 훅. (Phase 1.5)
// HTTPS(또는 localhost)에서만 동작. iOS 나침반은 사용자 제스처로 권한 요청 필요.

export interface GpsFix extends LatLng {
  accuracy: number;
  heading: number | null; // GPS 이동 방향 (정지 시 보통 null)
  ts: number;
}

export function useGeolocation() {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('이 브라우저는 위치를 지원하지 않는다');
      return;
    }
    if (watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setActive(true);
        setError(null);
        setFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: p.coords.heading != null && !Number.isNaN(p.coords.heading) ? p.coords.heading : null,
          ts: p.timestamp,
        });
      },
      (e) => setError(e.message || '위치 권한이 거부됨'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { fix, error, active, start, stop };
}

interface OrientationEventLike extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

export function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })?.requestPermission ===
      'function'
  );

  const handler = useCallback((e: Event) => {
    const ev = e as OrientationEventLike;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === 'number') {
      h = ev.webkitCompassHeading; // iOS: 0=북, 시계방향
    } else if (ev.absolute && typeof ev.alpha === 'number') {
      h = (360 - ev.alpha) % 360; // 절대 방위 alpha는 반시계 → 보정
    }
    if (h != null && !Number.isNaN(h)) setHeading(h);
  }, []);

  const attach = useCallback(() => {
    window.addEventListener('deviceorientationabsolute', handler as EventListener);
    window.addEventListener('deviceorientation', handler as EventListener);
    setEnabled(true);
  }, [handler]);

  const request = useCallback(async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE?.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          setNeedsPermission(false);
          attach();
        }
      } catch {
        /* 사용자가 거부 */
      }
    } else {
      attach();
    }
  }, [attach]);

  useEffect(
    () => () => {
      window.removeEventListener('deviceorientationabsolute', handler as EventListener);
      window.removeEventListener('deviceorientation', handler as EventListener);
    },
    [handler]
  );

  return { heading, enabled, needsPermission, request };
}
