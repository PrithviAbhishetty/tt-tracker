"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  played_at: string;
  rating: number;
}

export function EloHistoryChart({ data }: { data: Point[] }) {
  const chartData = data.map((p, i) => ({
    idx: i,
    rating: p.rating,
    played_at: p.played_at,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="idx"
            tick={{ fontSize: 10, fill: "#5a3a36" }}
            tickFormatter={() => ""}
            stroke="#7a3a36"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#5a3a36" }}
            domain={["dataMin - 20", "dataMax + 20"]}
            width={40}
            stroke="#7a3a36"
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              background: "#e8d5c5",
              border: "1px solid #7a3a36",
              borderRadius: 0,
              color: "#231915",
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as Point | undefined;
              return p ? new Date(p.played_at).toLocaleDateString() : "";
            }}
            formatter={(val) => [String(val), "ELO"]}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#86a07a"
            strokeWidth={2.4}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
