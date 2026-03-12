import type { Metadata } from 'next';
import RiskGame from './RiskGame';

export const metadata: Metadata = {
  title: 'RISK: Mission Control Edition',
  description: 'Conquer the gaming world — a Risk board game featuring the Mission:Control team',
};

export default function RiskPage() {
  return <RiskGame />;
}
