// Client-safe user↔email maps. Kept separate from auth.ts (which pulls in
// next-auth/bcrypt/mongo and can't be imported into a client bundle) so both the
// server (notifications, cron) and client (profile popup) can share one source
// of truth. auth.ts re-exports these for backward compatibility.

// fixedUserId → primary email (used for notifications and shown in the profile).
export const USER_PRIMARY_EMAIL: Record<string, string> = {
  anna: "anna@prosper-fi.com",
  aakarshit: "aakarshit@prosper-fi.com",
  usama: "uk@prosper-fi.com",
  ahsan: "mamr@binayah.com",
  prajeesh: "pm@binayah.com",
  abdallah: "ak@binayah.com",
  abhishek: "abhishek@binayah.ae",
  shyam: "shyam.m.bhundiya@gmail.com",
  deepshikha: "deepskarn15@gmail.com",
  yasmine: "yasmine@binayah.ae",
};

// Additional notification emails per user (beyond the primary).
export const USER_EXTRA_EMAILS: Record<string, string[]> = {
  abdallah: ["abdallahkalyar@gmail.com"],
};

export function getEmailForUser(fixedUserId: string): string | undefined {
  return USER_PRIMARY_EMAIL[fixedUserId];
}

/** Returns all notification emails for a user (primary + any extras). */
export function getEmailsForUser(fixedUserId: string): string[] {
  const primary = USER_PRIMARY_EMAIL[fixedUserId];
  const extras = USER_EXTRA_EMAILS[fixedUserId] ?? [];
  return primary ? [primary, ...extras] : extras;
}
