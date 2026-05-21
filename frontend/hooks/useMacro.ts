import { useQuery } from '@tanstack/react-query';
import { API_BASE, MacroData } from '../app/types';

const fetchMacro = async (): Promise<MacroData> => {
  const res = await fetch(`${API_BASE}/api/macro`);
  if (!res.ok) throw new Error('Failed to fetch macro data');
  return res.json();
};

export function useMacro() {
  const query = useQuery({
    queryKey: ['macro_overview'],
    queryFn: fetchMacro,
    staleTime: 60000,
  });

  return {
    macroData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
