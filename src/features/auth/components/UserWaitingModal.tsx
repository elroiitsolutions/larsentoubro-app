import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { ShieldCheck, Clock, XCircle, ArrowLeft } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "../services/authService";
import { UserProfile } from "@/types/common.types";

interface UserWaitingModalProps {
  requestId: string;
  email: string;
  onApproved: (token: string, user: UserProfile) => void;
  onCancel: () => void;
}

export const UserWaitingModal: React.FC<UserWaitingModalProps> = ({
  requestId,
  email,
  onApproved,
  onCancel,
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [status, setStatus] = useState<"PENDING" | "REJECTED" | "EXPIRED">("PENDING");
  const [rejectReason, setRejectReason] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    // Polling every 3 seconds for approval status
    const pollInterval = setInterval(async () => {
      if (status !== "PENDING") return;
      try {
        const res = await authService.checkLoginRequestStatus(requestId);
        if (res.success) {
          if (res.status === "APPROVED" && res.token && res.user) {
            if (isMounted) {
              onApproved(res.token, res.user);
            }
          } else if (res.status === "REJECTED") {
            if (isMounted) {
              setStatus("REJECTED");
              setRejectReason(res.reason || "Your login request was rejected by the administrator.");
            }
          } else if (res.status === "EXPIRED") {
            if (isMounted) {
              setStatus("EXPIRED");
            }
          }
        }
      } catch (e) {
        // Continue polling silently
      }
    }, 3000);

    // 10-minute countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isMounted) setStatus("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [requestId, onApproved, status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <Card className="w-full max-w-sm mx-auto p-6 items-center">
      {status === "PENDING" && (
        <View className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 items-center justify-center mb-4">
          <ShieldCheck size={32} color="#4F46E5" />
        </View>
      )}

      {status === "REJECTED" && (
        <View className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 items-center justify-center mb-4">
          <XCircle size={32} color="#EF4444" />
        </View>
      )}

      {status === "EXPIRED" && (
        <View className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 items-center justify-center mb-4">
          <Clock size={32} color="#F59E0B" />
        </View>
      )}

      <Text className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
        {status === "PENDING" && "Login Approval Requested"}
        {status === "REJECTED" && "Request Rejected"}
        {status === "EXPIRED" && "Request Expired"}
      </Text>

      <Text className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6">
        {status === "PENDING" && (
          <>
            Login request sent for <Text className="font-semibold text-slate-800 dark:text-slate-200">{email}</Text>.
            Waiting for administrator approval.
          </>
        )}
        {status === "REJECTED" && "Your login request was rejected by the administrator."}
        {status === "EXPIRED" && "Your login request timed out after 10 minutes without approval."}
      </Text>

      {status === "PENDING" && (
        <View className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-1.5">
            <Clock size={16} color="#4F46E5" />
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Time Remaining
            </Text>
          </View>
          <Text className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {formatTime(timeLeft)}
          </Text>
        </View>
      )}

      {status === "REJECTED" && rejectReason ? (
        <View className="w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3.5 rounded-xl mb-6">
          <Text className="text-xs text-red-600 dark:text-red-400 font-medium">
            Reason: {rejectReason}
          </Text>
        </View>
      ) : null}

      <Button
        title={status === "PENDING" ? "Cancel & Return to Login" : "Try Logging In Again"}
        variant="outline"
        onPress={onCancel}
        icon={<ArrowLeft size={16} color="#475569" />}
      />
    </Card>
  );
};
