import React from "react";

interface VersionInfoProps {
  version: string;
  buildTime: string;
  className?: string;
}

function formatBuildTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  version,
  buildTime,
  className = "",
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md text-xs text-slate-600 ${className}`}
    >
      <span className="font-semibold text-slate-700">v{version}</span>
      <span className="text-slate-400">•</span>
      <span className="text-slate-500">{formatBuildTime(buildTime)}</span>
    </div>
  );
};
