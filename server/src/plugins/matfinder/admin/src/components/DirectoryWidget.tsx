import { CheckCircle, Earth, Files, Pencil, PinMap, SealCheck } from '@strapi/icons';
import { Widget, useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { startPolling } from '../poll';
import { pagePath } from '../tabs';
import { StatGrid } from './StatGrid';

type Summary = {
  gyms: { total: number; published: number; unpublishedChanges: number; neverPublished: number; claimed: number; fromWeb: { thisWeek: number } };
};

/** Homepage widget: all gyms, how many are published, modified or drafts, added from the web in the last week, and claimed. */
export default function DirectoryWidget() {
  const { get } = useFetchClient();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(
    () =>
      startPolling(async () => {
        try {
          const res = await get('/matfinder/summary');
          setData(res.data as Summary);
          setError(false);
        } catch {
          // Keep the last numbers on a failed refresh; show the error only when there's nothing to show.
          setError(true);
        }
      }, 30_000),
    [get],
  );

  if (!data && error) return <Widget.Error />;
  if (!data) return <Widget.Loading />;
  const g = data.gyms;
  if (g.total === 0) return <Widget.NoData>No gyms yet</Widget.NoData>;
  return (
    <StatGrid
      stats={[
        { label: 'All gyms', value: g.total, icon: <PinMap />, tone: 'primary', to: pagePath('gyms') },
        { label: 'Published', value: g.published, icon: <CheckCircle />, tone: 'success', to: pagePath('gyms', { status: 'published' }) },
        { label: 'Modified', value: g.unpublishedChanges, icon: <Pencil />, tone: 'alternative', to: pagePath('gyms', { status: 'unpublished-changes' }) },
        { label: 'Drafts', value: g.neverPublished, icon: <Files />, tone: 'secondary', to: pagePath('gyms', { status: 'never-published' }) },
        { label: 'New from the web', value: g.fromWeb.thisWeek, icon: <Earth />, tone: 'warning', to: pagePath('from-web'), hint: 'Added by the web agent in the last 7 days' },
        { label: 'Claimed', value: g.claimed, icon: <SealCheck />, tone: 'neutral', to: pagePath('claims', { status: 'accepted' }) },
      ]}
    />
  );
}
