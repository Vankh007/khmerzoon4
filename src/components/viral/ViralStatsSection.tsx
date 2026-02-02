import { TrendingUp, Flame, Eye, Clock } from 'lucide-react';

interface ViralStatsSectionProps {
  trendingCount: number;
  shortsCount: number;
  totalViews: number;
  formatViews: (views: number) => string;
}

const ViralStatsSection = ({ trendingCount, shortsCount, totalViews, formatViews }: ViralStatsSectionProps) => {
  const stats = [
    {
      icon: TrendingUp,
      label: 'Trending',
      value: trendingCount.toString(),
      description: 'Popular titles',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
    },
    {
      icon: Flame,
      label: 'Viral',
      value: shortsCount.toString(),
      description: 'Hot shorts',
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-500',
    },
    {
      icon: Eye,
      label: 'Total Views',
      value: formatViews(totalViews),
      description: 'Combined views',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
    },
    {
      icon: Clock,
      label: 'Updated',
      value: 'Now',
      description: 'Real-time data',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.label}
          className={`p-4 md:p-6 rounded-xl border border-border bg-gradient-to-br ${stat.gradient} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-300`}
        >
          <div className={`flex items-center gap-2 ${stat.iconColor} mb-3`}>
            <stat.icon className="w-5 h-5" />
            <span className="text-sm font-medium text-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ViralStatsSection;
