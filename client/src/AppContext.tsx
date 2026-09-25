import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Meta } from './api';

type Ctx = {
  meta: Meta | null;
  period: number;
  setPeriod: (p: number) => void;
  blockId: number | null;
  setBlockId: (b: number | null) => void;
  processing: boolean;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [period, setPeriod] = useState(30);
  const [blockId, setBlockId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    api.get('/meta').then((r) => {
      setMeta(r.data);
      setProcessing(false);
    });
  }, []);

  return (
    <AppCtx.Provider value={{ meta, period, setPeriod, blockId, setBlockId, processing }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
