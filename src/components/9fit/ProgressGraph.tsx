import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

const data = [
  { date: "01/09", km: 5, force: 12 },
  { date: "05/09", km: 7, force: 15 },
  { date: "10/09", km: 6, force: 14 },
  { date: "15/09", km: 8, force: 18 },
  { date: "20/09", km: 10, force: 20 },
  { date: "25/09", km: 9, force: 22 },
];

export function ProgressGraph() {
  return (
    <div className="mx-5 mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <h3 className="text-white font-semibold mb-4 text-sm">Progressão Força vs KM</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorForce" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b2c" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ff6b2c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#666" fontSize={10} />
            <YAxis stroke="#666" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: "#111", border: "none", fontSize: "12px" }} />
            <Area type="monotone" dataKey="force" stroke="#ff6b2c" fillOpacity={1} fill="url(#colorForce)" name="Força (t)" />
            <Line type="monotone" dataKey="km" stroke="#ffffff" strokeWidth={2} name="KM" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
