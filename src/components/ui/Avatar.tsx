"use client";

import { useState } from "react";
import { AVATARS, type UserType } from "@/lib/data";

export const AvatarC = ({ user, size = 28 }: { user: UserType; size?: number }) => {
  const [loaded, setLoaded] = useState(false);
  const initial = user.name?.[0]?.toUpperCase() || "?";
  const fontSize = size * 0.42;

  const placeholder = (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, ${user.color}55, ${user.color}22)`,
      border: `2px solid ${user.color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 800, color: user.color,
      boxShadow: `0 0 10px ${user.color}22`,
      flexShrink: 0, fontFamily: "var(--font-dm-sans), sans-serif",
    }}>
      {initial}
    </div>
  );

  // AI-generated custom image
  if (user.aiAvatar) {
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        {!loaded && placeholder}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.aiAvatar}
          alt={user.name}
          title={user.name}
          onLoad={() => setLoaded(true)}
          style={{
            position: loaded ? "relative" : "absolute",
            inset: 0, opacity: loaded ? 1 : 0,
            width: size, height: size, borderRadius: "50%",
            objectFit: "cover",
            border: `2px solid ${user.color}55`,
            boxShadow: `0 0 10px ${user.color}22`,
            transition: "opacity 0.2s",
          }}
        />
      </div>
    );
  }

  const av = AVATARS.find(a => a.id === user.avatar) || AVATARS[0];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }} title={`${user.name} — ${av.name}`}>
      {!loaded && placeholder}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={av.img}
        alt={user.name}
        onLoad={() => setLoaded(true)}
        style={{
          position: loaded ? "relative" : "absolute",
          inset: 0, opacity: loaded ? 1 : 0,
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", objectPosition: "top",
          border: `2px solid ${user.color}55`,
          boxShadow: `0 0 10px ${user.color}22`,
          transition: "opacity 0.2s",
          background: "#111",
        }}
      />
    </div>
  );
};
