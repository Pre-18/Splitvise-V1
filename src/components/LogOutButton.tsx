"use client";

import { signOut } from "next-auth/react";

export function LogOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500 text-sm font-medium"
    >
      Sign Out
    </button>
  );
}
