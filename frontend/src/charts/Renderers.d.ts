import type { ReactElement } from 'react';
export type CompletionPoint = {
  week: string;
  count: number;
};
export type StageSlice = {
  name: string;
  value: number;
  fill: string;
};
export function CompletionChart(props: {
  points: CompletionPoint[];
}): ReactElement;
export function DistributionChart(props: {
  slices: StageSlice[];
}): ReactElement;
