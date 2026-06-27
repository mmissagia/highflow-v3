import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrg } from '@/contexts/OrgContext';
import type { Node, Edge } from '@xyflow/react';
import type { Json } from '@/integrations/supabase/types';

export interface Strategy {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

interface DbStrategy {
  id: string;
  name: string;
  nodes: Json;
  edges: Json;
  created_at: string;
  updated_at: string;
}

const parseStrategy = (db: DbStrategy): Strategy => ({
  id: db.id,
  name: db.name,
  nodes: (db.nodes as unknown as Node[]) || [],
  edges: (db.edges as unknown as Edge[]) || [],
  created_at: db.created_at,
  updated_at: db.updated_at,
});

export function useStrategies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useOrg();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['strategies', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('org_id', activeCompanyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as DbStrategy[]).map(parseStrategy);
    },
    enabled: !!activeCompanyId,
  });

  const createStrategy = useMutation({
    mutationFn: async ({ name, nodes, edges }: { name: string; nodes: Node[]; edges: Edge[] }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name,
          nodes: nodes as unknown as Json,
          edges: edges as unknown as Json,
          user_id: user.id,
          org_id: activeCompanyId!,
        })
        .select()
        .single();
      
      if (error) throw error;
      return parseStrategy(data as DbStrategy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast({ title: 'Estratégia criada', description: 'Sua jornada de vendas foi salva.' });
    },
    onError: (error) => {
      console.error('Error creating strategy:', error);
      toast({ title: 'Estratégia não foi criada — falha ao salvar. Verifique sua conexão e tente novamente.', variant: 'destructive' });
    },
  });

  const updateStrategy = useMutation({
    mutationFn: async ({ id, name, nodes, edges }: { id: string; name: string; nodes: Node[]; edges: Edge[] }) => {
      const { data, error } = await supabase
        .from('strategies')
        .update({ 
          name, 
          nodes: nodes as unknown as Json, 
          edges: edges as unknown as Json 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return parseStrategy(data as DbStrategy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast({ title: 'Estratégia salva', description: 'Alterações persistidas.' });
    },
    onError: (error) => {
      console.error('Error updating strategy:', error);
      toast({ title: 'Estratégia não foi salva — falha ao persistir. Verifique sua conexão e tente novamente.', variant: 'destructive' });
    },
  });

  const deleteStrategy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast({ title: 'Estratégia excluída' });
    },
    onError: () => {
      toast({ title: 'Estratégia não foi excluída — tente novamente.', variant: 'destructive' });
    },
  });

  return {
    strategies,
    isLoading,
    createStrategy,
    updateStrategy,
    deleteStrategy,
  };
}
