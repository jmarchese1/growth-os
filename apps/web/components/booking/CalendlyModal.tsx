'use client';
import { useEffect } from 'react';
import { getCalApi } from '@calcom/embed-react';

interface Props {
  calLink: string;
  children: React.ReactNode;
}

export default function CalModal({ calLink, children }: Props) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, []);

  return (
    <button
      data-cal-link={calLink}
      data-cal-config='{"layout":"month_view"}'
    >
      {children}
    </button>
  );
}
