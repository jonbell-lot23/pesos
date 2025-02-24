import { cookies } from "next/headers";

const VIEW_PREFERENCE_COOKIE = "dashboard_view_preference";

export function getViewPreference(): "simple" | "detailed" {
  const cookieStore = cookies();
  return (
    (cookieStore.get(VIEW_PREFERENCE_COOKIE)?.value as "simple" | "detailed") ||
    "simple"
  );
}

export function setViewPreference(preference: "simple" | "detailed") {
  const cookieStore = cookies();
  cookieStore.set(VIEW_PREFERENCE_COOKIE, preference, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
