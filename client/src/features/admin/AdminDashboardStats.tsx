import { Users, KeyRound, Server, Loader2 } from "lucide-react";

interface AdminDashboardStatsProps {
  userCount: number;
  apiKeyCount: number;
  serverCount: number;
  loading?: boolean;
}

export function AdminDashboardStats({ 
  userCount, 
  apiKeyCount, 
  serverCount, 
  loading = false 
}: AdminDashboardStatsProps) {
  const stats = [
    {
      title: "المستخدمين",
      value: userCount,
      icon: <Users className="text-yellow-400 h-5 w-5" />,
      description: "إجمالي المستخدمين المسجلين",
      bgClass: "bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-yellow-500/30"
    },
    {
      title: "مفاتيح API",
      value: apiKeyCount,
      icon: <KeyRound className="text-green-400 h-5 w-5" />,
      description: "المفاتيح المكونة",
      bgClass: "bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30"
    },
    {
      title: "الخوادم",
      value: serverCount,
      icon: <Server className="text-blue-400 h-5 w-5" />,
      description: "خوادم النشر المكونة",
      bgClass: "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-500/30"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="border border-gray-700/50 rounded-xl p-4 bg-gray-800/20 backdrop-blur-sm animate-pulse"
          >
            <div className="h-12 w-12 rounded-full bg-gray-700/50 mb-4 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
            </div>
            <div className="h-6 w-24 bg-gray-700/50 rounded mb-2"></div>
            <div className="h-4 w-36 bg-gray-700/50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className={`border border-gray-700/50 rounded-xl p-4 ${stat.bgClass} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
        >
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 rounded-full bg-gray-800/50 border border-gray-700/50 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              {stat.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{stat.title}</h3>
              <p className="text-sm text-gray-400">{stat.description}</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboardStats;