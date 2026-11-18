import React, { useId } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export function CompletionChart({
  points
}) {
  const gradient = useId().replace(/:/g, '');
  return <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{
      top: 10,
      right: 8,
      left: -25,
      bottom: 0
    }}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#53b2a8" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#53b2a8" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e5ebeb" strokeDasharray="3 4" />
        <XAxis dataKey="week" tick={{
        fontSize: 11,
        fill: '#526675'
      }} tickLine={false} axisLine={false} minTickGap={15} />
        <YAxis allowDecimals={false} tick={{
        fontSize: 11,
        fill: '#526675'
      }} tickLine={false} axisLine={false} domain={[0, max => Math.max(1, max)]} />
        <Tooltip labelFormatter={v => 'Week of ' + v} />
        <Area type="linear" dataKey="count" name="Completed" stroke="#168579" strokeWidth={2.5} fill={'url(#' + gradient + ')'} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>;
}
export function DistributionChart({
  slices
}) {
  return <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius="71%" outerRadius="96%" startAngle={90} endAngle={-270} paddingAngle={1} isAnimationActive={false}>
          {slices.map(s => <Cell key={s.name} fill={s.fill} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>;
}
