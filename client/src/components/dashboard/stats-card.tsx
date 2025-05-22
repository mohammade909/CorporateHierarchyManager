import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Users, UserCog, MessageSquare, Video } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  change: number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

export default function StatsCard({
  title,
  value,
  change,
  icon,
  iconBgColor,
  iconColor,
}: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "users":
        return <Users className={`h-6 w-6 ${iconColor}`} />;
      case "supervisors":
        return <UserCog className={`h-6 w-6 ${iconColor}`} />;
      case "chat":
        return <MessageSquare className={`h-6 w-6 ${iconColor}`} />;
      case "video":
        return <Video className={`h-6 w-6 ${iconColor}`} />;
      default:
        return <Users className={`h-6 w-6 ${iconColor}`} />;
    }
  };

  return (
    <Card className="bg-white p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-semibold mt-1">{value.toLocaleString()}</h3>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-full flex items-center justify-center`}>
          {getIcon()}
        </div>
      </div>
      <div className="flex items-center mt-4">
        <span
          className={`text-sm font-medium flex items-center ${
            change >= 0 ? "text-success" : "text-danger"
          }`}
        >
          {change >= 0 ? (
            <ArrowUp className="h-4 w-4 mr-0.5" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-0.5" />
          )}
          {Math.abs(change)}%
        </span>
        <span className="text-gray-500 text-sm ml-2">vs last month</span>
      </div>
    </Card>
  );
}
