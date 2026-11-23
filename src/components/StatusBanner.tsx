import type { AirState } from '../hooks/useAir';

const timeOf = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export function StatusBanner({ air }: { air: AirState }) {
  const { status, snapshot, message } = air;
  const text = {
    sample:
      'Showing a sample winter-smog day for New Delhi. Search your city or use your location for live data.',
    loading: `Fetching live air data for ${snapshot.place.name}…`,
    error: `Couldn't load live data (${message ?? 'network error'}). Showing a sample day instead.`,
    live: `Live data for ${snapshot.place.name} · updated ${timeOf(snapshot.fetchedAt)}`,
  }[status];
  return (
    <p className={`banner banner-${status}`} role="status" aria-live="polite">
      {text}
    </p>
  );
}
