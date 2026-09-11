"use client";
import { useEffect, useState } from "react";
import { subscribeMemberAvatars, type MemberAvatarMap } from "@/lib/member-avatars";
import type { Member } from "@/lib/types";

function useMemberAvatars(): MemberAvatarMap {
  const [map, setMap] = useState<MemberAvatarMap>({});
  useEffect(() => subscribeMemberAvatars(setMap), []);
  return map;
}

type Props = { member: Member; index?: number; variant?: "studio-person" | "studio-avatar" };

// Renders the uploaded profile photo when one exists, else the initial-letter
// circle (same classes as before, so every existing size/color override in
// studio.css keeps working unchanged).
export function MemberAvatar({ member, index = 0, variant = "studio-person" }: Props) {
  const avatars = useMemberAvatars();
  const url = avatars[member];
  if (url) return <img src={url} alt={member} className={variant} />;
  const initialClass = variant === "studio-person" ? `studio-person studio-person-${index}` : variant;
  return <span className={initialClass}>{member[0]}</span>;
}
