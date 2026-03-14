import MoneyPathTimelineClient from './timeline-client';

export default async function MoneyPathTimelinePage({ params }: { params: Promise<{ transferId: string }> }) {
  const { transferId } = await params;
  return <MoneyPathTimelineClient transferId={transferId} />;
}

