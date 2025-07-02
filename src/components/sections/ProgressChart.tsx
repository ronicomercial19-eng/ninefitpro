import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ProgressChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 250;

    // Sample data representing progress over 12 weeks
    const data = [0, 5, 12, 18, 25, 35, 42, 48, 58, 65, 72, 80, 85];
    const weeks = data.length - 1;
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set styles
    ctx.strokeStyle = '#FF8000';
    ctx.fillStyle = '#FF8000';
    ctx.lineWidth = 3;
    
    // Draw axes
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw progress line
    ctx.strokeStyle = '#FF8000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((value, index) => {
      const x = padding + (index / weeks) * chartWidth;
      const y = canvas.height - padding - (value / 100) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
    gradient.addColorStop(0, 'rgba(255, 128, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 128, 0, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    
    data.forEach((value, index) => {
      const x = padding + (index / weeks) * chartWidth;
      const y = canvas.height - padding - (value / 100) * chartHeight;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.fill();
    
    // Draw data points
    ctx.fillStyle = '#FF8000';
    data.forEach((value, index) => {
      const x = padding + (index / weeks) * chartWidth;
      const y = canvas.height - padding - (value / 100) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Add labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    
    // Week labels
    for (let i = 0; i <= weeks; i += 3) {
      const x = padding + (i / weeks) * chartWidth;
      ctx.fillText(`${i}`, x, canvas.height - padding + 20);
    }
    
    // Progress percentage labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 100; i += 25) {
      const y = canvas.height - padding - (i / 100) * chartHeight;
      ctx.fillText(`${i}%`, padding - 10, y + 4);
    }
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Evolução Típica dos Usuários', canvas.width / 2, 25);
    
  }, []);

  return (
    <Card className="bg-black/50 border-orange-500/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-center">📈 Seus Resultados em 12 Semanas</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <canvas 
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </CardContent>
    </Card>
  );
};