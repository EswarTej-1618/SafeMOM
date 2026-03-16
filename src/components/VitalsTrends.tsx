import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { Activity, Heart, Droplets, Footprints, Wind, ActivitySquare, Zap, Cookie, Brain, Waves, HeartPulse, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRange = "1D" | "7D" | "1M" | "10M";
type Metric = "heartRate" | "bp" | "spo2" | "steps" | "stress" | "glucose" | "temperature";

// Generate realistic mock data for different time ranges
const generateData = (range: TimeRange, metric: Metric) => {
  const data = [];
  const now = new Date();

  let points = 24; // 1D (hourly)
  if (range === "7D") points = 7;
  if (range === "1M") points = 30;
  if (range === "10M") points = 10; // monthly for pregnancy

  for (let i = points; i >= 0; i--) {
    const d = new Date(now);
    let label = "";

    if (range === "1D") {
      d.setHours(d.getHours() - i);
      label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (range === "7D" || range === "1M") {
      d.setDate(d.getDate() - i);
      label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      d.setMonth(d.getMonth() - i);
      label = d.toLocaleDateString([], { month: 'short' });
    }

    if (metric === "heartRate") {
      data.push({
        time: label,
        value: Math.floor(Math.random() * (95 - 65 + 1) + 65), // 65-95 bpm
      });
    } else if (metric === "bp") {
      data.push({
        time: label,
        systolic: Math.floor(Math.random() * (135 - 110 + 1) + 110),
        diastolic: Math.floor(Math.random() * (85 - 70 + 1) + 70),
      });
    } else if (metric === "spo2") {
      data.push({
        time: label,
        value: Math.floor(Math.random() * (100 - 95 + 1) + 95), // 95-100%
      });
    } else if (metric === "steps") {
      data.push({
        time: label,
        value: Math.floor(Math.random() * (12000 - 3000 + 1) + 3000),
      });
    } else if (metric === "stress") {
      data.push({
        time: label,
        value: Math.floor(Math.random() * (60 - 20 + 1) + 20),
      });
    } else if (metric === "glucose") {
      data.push({
        time: label,
        value: Math.floor(Math.random() * (120 - 70 + 1) + 70),
      });
    } else if (metric === "temperature") {
      data.push({
        time: label,
        value: Number((Math.random() * (38 - 36) + 36).toFixed(1)),
      });
    }
  }
  return data;
};

export const VitalsTrends = ({ className }: { className?: string }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");
  const [metric, setMetric] = useState<Metric>("heartRate");

  const data = useMemo(() => generateData(timeRange, metric), [timeRange, metric]);

  const metricConfig: Record<Metric, { title: string; color: string; color2?: string; unit: string; icon: React.ElementType }> = {
    heartRate: { title: "Heart Rate Trends", color: "#F43F5E", unit: "BPM", icon: Heart },
    bp: { title: "Blood Pressure Trends", color: "#3B82F6", color2: "#8B5CF6", unit: "mmHg", icon: HeartPulse },
    spo2: { title: "SpO₂ Level Trends", color: "#0EA5E9", unit: "%", icon: Waves },
    steps: { title: "Daily Steps Trends", color: "#10B981", unit: "steps", icon: Footprints },
    stress: { title: "Stress Level Trends", color: "#A855F7", unit: "%", icon: Brain },
    glucose: { title: "Glucose Level Trends", color: "#22C55E", unit: "mg/dL", icon: Cookie },
    temperature: { title: "Body Temperature Trends", color: "#FB923C", unit: "°C", icon: Thermometer },
  };

  const curr = metricConfig[metric];
  const Icon = curr.icon;

  return (
    <Card className={cn("rounded-2xl overflow-hidden border-border/50 shadow-sm", className)}>
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${curr.color}20`, color: curr.color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Historical Trends
              </CardTitle>
              <CardDescription>Track maternal vitals over the gestation period</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="w-[200px] sm:w-[240px]">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="1D" className="text-xs">1D</TabsTrigger>
                <TabsTrigger value="7D" className="text-xs">7D</TabsTrigger>
                <TabsTrigger value="1M" className="text-xs">1M</TabsTrigger>
                <TabsTrigger value="10M" className="text-xs">10M</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex overflow-x-auto gap-2 mt-4 pb-2 scrollbar-none">
          {(Object.keys(metricConfig) as Metric[]).map((m) => {
            const mConf = metricConfig[m];
            const MIcon = mConf.icon;
            const active = metric === m;
            return (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                )}
              >
                <MIcon className="w-3.5 h-3.5" />
                {mConf.title.replace(" Trends", "")}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-6 pb-6">
        <div className="h-[360px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {metric === "bp" ? (
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" name="Systolic" dataKey="systolic" stroke={curr.color} strokeWidth={3} dot={{ r: 4, fill: curr.color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Diastolic" dataKey="diastolic" stroke={curr.color2 || curr.color} strokeWidth={3} dot={{ r: 4, fill: curr.color2 || curr.color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={curr.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={curr.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value} ${curr.unit}`, curr.title]}
                />
                <Area type="monotone" dataKey="value" stroke={curr.color} strokeWidth={3} fillOpacity={1} fill={`url(#grad-${metric})`} activeDot={{ r: 6, fill: curr.color, stroke: "hsl(var(--background))", strokeWidth: 2 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
