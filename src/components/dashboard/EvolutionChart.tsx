
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { date: '01/01', weight: 82.5, bodyFat: 18.2 },
  { date: '15/01', weight: 81.2, bodyFat: 17.8 },
  { date: '01/02', weight: 80.1, bodyFat: 17.3 },
  { date: '15/02', weight: 79.5, bodyFat: 16.9 },
  { date: '01/03', weight: 78.8, bodyFat: 16.4 },
  { date: '15/03', weight: 78.5, bodyFat: 16.1 },
];

export const EvolutionChart = () => {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke="#f97316" 
            strokeWidth={3}
            dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
            name="Peso (kg)"
          />
          <Line 
            type="monotone" 
            dataKey="bodyFat" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="% Gordura"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
