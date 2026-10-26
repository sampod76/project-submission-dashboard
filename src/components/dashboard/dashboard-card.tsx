import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  bgColor?: string;
}

const StatCard = ({ title, value, icon, bgColor = "bg-[#7E8CE0]" }: StatCardProps) => (
  <div
    className={`${bgColor} flex items-center justify-between rounded-sm p-5 text-white transition-all duration-300`}
  >
    <div>
      <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider opacity-90">{title}</p>
    </div>
    <div className="rounded-3xl bg-white/20 p-3 backdrop-blur-sm">{icon}</div>
  </div>
);

interface IDashboardCardProps {
  stats?: StatCardProps[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="flex animate-pulse items-center justify-between rounded-sm border border-gray-100 bg-white p-5 shadow-sm">
    <div className="w-full space-y-3">
      <div className="h-8 w-1/3 rounded bg-gray-200"></div>
      <div className="h-4 w-1/2 rounded bg-gray-200"></div>
    </div>
    <div className="h-12 w-12 rounded-xl bg-gray-200 p-3"></div>
  </div>
);

export default function DashboardCard({
  stats = [
    { title: "Sample Stat", value: "0" },
    { title: "Sample Stat", value: "0" },
    { title: "Sample Stat", value: "0" },
  ],
  isLoading = false,
}: IDashboardCardProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>
    </div>
  );
}
