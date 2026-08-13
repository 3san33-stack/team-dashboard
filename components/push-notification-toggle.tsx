"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Bell, BellRing } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/push";
import type { Member } from "@/lib/types";

type Props = { member: Member };

export function PushNotificationToggle({ member }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "on" | "error">("idle");

  if (!isPushSupported()) return null;

  async function handleClick() {
    setStatus("loading");
    try {
      await subscribeToPush(member);
      setStatus("on");
    } catch {
      setStatus("error");
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={status === "loading" || status === "on"}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      aria-label="평일 알림 받기"
      title={status === "on" ? "알림 켜짐" : status === "error" ? "알림 설정 실패 — 다시 시도" : "평일 알림 받기"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm disabled:opacity-70"
    >
      {status === "on" ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </motion.button>
  );
}
