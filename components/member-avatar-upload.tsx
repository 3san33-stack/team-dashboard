"use client";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { uploadSampleRequestImage } from "@/lib/image-upload";
import { setMemberAvatar } from "@/lib/member-avatars";
import type { Member } from "@/lib/types";

// Own-profile avatar with a small camera badge to swap the photo. Reuses the
// existing `sample-request-images` bucket (image-upload.ts compresses to
// ≤1600px JPEG first), so no new Storage bucket/policy is needed.
export function MemberAvatarUpload({ member }: { member: Member }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(false);
    try {
      const url = await uploadSampleRequestImage(file);
      await setMemberAvatar(member, url);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="studio-avatar-edit">
      <MemberAvatar member={member} />
      <button
        type="button"
        className="studio-avatar-edit-btn"
        aria-label="프로필 사진 변경"
        title={error ? "업로드 실패, 다시 시도해 주세요" : "프로필 사진 변경"}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Camera size={12} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </span>
  );
}
