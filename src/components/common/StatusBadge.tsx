import React from "react";
import { Badge } from "@/components/ui/Badge";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const getVariant = (st: string) => {
    const s = st.toLowerCase();
    if (s.includes("active") || s.includes("available") || s.includes("approved") || s.includes("completed")) {
      return "success";
    }
    if (s.includes("pending") || s.includes("in progress") || s.includes("in transit") || s.includes("issued")) {
      return "warning";
    }
    if (s.includes("inactive") || s.includes("rejected") || s.includes("damaged") || s.includes("lost") || s.includes("expired")) {
      return "destructive";
    }
    return "neutral";
  };

  return <Badge label={status} variant={getVariant(status)} size={size} />;
};
