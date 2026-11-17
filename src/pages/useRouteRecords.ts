import { useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useData } from '../data/store';
import type { Garment, Profile } from '../data/types';

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const samePath = (a: string, b: string) => decode(a).replace(/\/+$/, '') === decode(b).replace(/\/+$/, '');

/**
 * The profile (and garment) named in the URL, by readable name or by id.
 * While the URL stays the same, the page keeps showing the same record even if it is renamed,
 * and `redirect` gives its new address so the page can move there.
 */
export function useRouteRecords(): { profile?: Profile; garment?: Garment; redirect: string | null } {
  const { profileSlug = '', garmentSlug } = useParams();
  const data = useData();
  const location = useLocation();
  const lastProfile = useRef<{ segment: string; id: string } | null>(null);
  const lastGarment = useRef<{ segment: string; id: string } | null>(null);

  let profile = lastProfile.current?.segment === profileSlug
    ? data.profiles.find((p) => p.id === lastProfile.current!.id)
    : undefined;
  profile ??= data.findProfile(profileSlug);
  lastProfile.current = profile ? { segment: profileSlug, id: profile.id } : null;

  let garment: Garment | undefined;
  if (profile && garmentSlug !== undefined) {
    const key = `${profile.id}/${garmentSlug}`;
    garment = lastGarment.current?.segment === key
      ? data.garments.find((g) => g.id === lastGarment.current!.id && g.profileId === profile!.id)
      : undefined;
    garment ??= data.findGarment(profile.id, garmentSlug);
    lastGarment.current = garment ? { segment: key, id: garment.id } : null;
  }

  const canonical = !profile ? null
    : garmentSlug === undefined ? data.profilePath(profile.id)
    : garment ? data.garmentPath(garment) : null;
  const redirect = canonical && !samePath(canonical, location.pathname) ? canonical + location.search : null;
  return { profile, garment, redirect };
}
