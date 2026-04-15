"use client";

import { AVATARS, type UserType } from "@/lib/data";

export const AvatarC = ({ user, size = 28 }: { user: UserType; size?: number }) => {
  const av = AVATARS.find(a => a.id === user.avatar) || AVATARS[0];
  return (
    <div
      title={user.name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%,${user.color}44,${user.color}11)`,
        border: `2px solid ${user.color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5,
        boxShadow: `0 0 10px ${user.color}22`,
      }}
    >
      {av.emoji}
    </div>
  );
};
