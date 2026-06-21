// 지구 좌표 계산 유틸 (순수 함수).

const R = 6371000; // 지구 반지름 (m)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

/** 두 좌표 사이 거리 (미터) */
export function haversine(a: LatLng, b: LatLng): number {
  const dφ = toRad(b.lat - a.lat);
  const dλ = toRad(b.lng - a.lng);
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 시작점에서 bearing(도, 0=북) 방향으로 distM 미터 떨어진 좌표 */
export function destination(from: LatLng, bearingDeg: number, distM: number): LatLng {
  const br = toRad(bearingDeg);
  const φ1 = toRad(from.lat);
  const λ1 = toRad(from.lng);
  const dr = distM / R;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(dr) + Math.cos(φ1) * Math.sin(dr) * Math.cos(br));
  const λ2 =
    λ1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(φ1), Math.cos(dr) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** 두 각도(도) 사이 최단 회전 차이 (-180..180) */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}
