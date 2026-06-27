import { supabase } from '@/integrations/supabase/client';

type Channel = 'whatsapp' | 'email' | 'sms' | 'ligacao' | 'evento' | 'outro';
type CampaignType = 'automatizada' | 'manual';
type Status = 'ativo' | 'inativo' | 'rascunho';

interface MockCampaign {
  name: string;
  type: CampaignType;
  channel: Channel;
  status: Status;
}

const MOCK_POOL: MockCampaign[] = [
  { name: 'Sequência de aquecimento', type: 'automatizada', channel: 'whatsapp', status: 'ativo' },
  { name: 'Follow-up pós-evento', type: 'manual', channel: 'email', status: 'ativo' },
  { name: 'Convite para webinar', type: 'automatizada', channel: 'email', status: 'ativo' },
  { name: 'Reativação de leads frios', type: 'automatizada', channel: 'whatsapp', status: 'inativo' },
  { name: 'Ligação de fechamento', type: 'manual', channel: 'ligacao', status: 'rascunho' },
  { name: 'SMS de urgência', type: 'automatizada', channel: 'sms', status: 'ativo' },
  { name: 'Oferta exclusiva 24h', type: 'automatizada', channel: 'whatsapp', status: 'ativo' },
  { name: 'Check-in de engajamento', type: 'manual', channel: 'ligacao', status: 'ativo' },
  { name: 'Convite para evento presencial', type: 'automatizada', channel: 'evento', status: 'rascunho' },
  { name: 'Nurturing de conteúdo', type: 'automatizada', channel: 'email', status: 'inativo' },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function seedDemoCampaigns(
  strategyId: string,
  edges: Array<{ source: string; target: string }>
): Promise<number> {
  await supabase
    .from('campaigns')
    .delete()
    .eq('strategy_id', strategyId);

  if (edges.length === 0) return 0;

  // campaigns inherit the org of their parent strategy
  const { data: strat } = await supabase
    .from('strategies')
    .select('org_id')
    .eq('id', strategyId)
    .single();
  const orgId = (strat?.org_id ?? null) as string | null;

  const records = edges.flatMap((edge) => {
    const count = Math.random() > 0.4 ? 2 : 1;
    return pickRandom(MOCK_POOL, count).map((mock) => ({
      strategy_id: strategyId,
      org_id: orgId!,
      edge_source: edge.source,
      edge_target: edge.target,
      ...mock,
    }));
  });

  const { error } = await supabase.from('campaigns').insert(records);
  if (error) throw error;

  return records.length;
}
