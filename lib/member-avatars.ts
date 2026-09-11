import { supabase } from "./supabase";
import type { Member } from "./types";

// Per-member profile photo, keyed off the `member_avatars` table (member → avatar_url).
// Module-level cache + pub-sub so every mounted <MemberAvatar> across the page
// (sidebar, topbar, team list, login screen) updates the instant one member
// uploads a new photo, without a React context provider.
export type MemberAvatarMap = Partial<Record<Member, string>>;

let cache: MemberAvatarMap | null = null;
let inFlight: Promise<MemberAvatarMap> | null = null;
const listeners = new Set<(map: MemberAvatarMap) => void>();

async function fetchAll(): Promise<MemberAvatarMap> {
  const { data, error } = await supabase.from("member_avatars").select("member,avatar_url");
  if (error) throw error;
  const map: MemberAvatarMap = {};
  for (const row of data ?? []) map[row.member as Member] = row.avatar_url as string;
  return map;
}

export function subscribeMemberAvatars(listener: (map: MemberAvatarMap) => void): () => void {
  listeners.add(listener);
  if (cache) {
    listener(cache);
  } else {
    if (!inFlight) inFlight = fetchAll().then((m) => { cache = m; inFlight = null; return m; });
    inFlight.then((m) => listener(m)).catch(() => {});
  }
  return () => listeners.delete(listener);
}

export async function setMemberAvatar(member: Member, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from("member_avatars").upsert({ member, avatar_url: avatarUrl });
  if (error) throw error;
  cache = { ...(cache ?? {}), [member]: avatarUrl };
  listeners.forEach((l) => l(cache!));
}
