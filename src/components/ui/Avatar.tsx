"use client";

import { AVATARS, type UserType } from "@/lib/data";

export const AvatarC = ({ user, size = 28 }: { user: UserType; size?: number }) => {
  // AI-generated image (custom, stored as data URL)
  if (user.aiAvatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.aiAvatar}
        alt={user.name}
        title={user.name}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover",
          border: `2px solid ${user.color}55`,
          boxShadow: `0 0 10px ${user.color}22`,
          flexShrink: 0,
        }}
      />
    );
  }

  const av = AVATARS.find(a => a.id === user.avatar) || AVATARS[0];

  // Image-based avatar
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={av.img}
      alt={user.name}
      title={`${user.name} — ${av.name}`}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", objectPosition: "top",
        border: `2px solid ${user.color}55`,
        boxShadow: `0 0 10px ${user.color}22`,
        flexShrink: 0,
        background: "#111",
      }}
    />
  );
};
