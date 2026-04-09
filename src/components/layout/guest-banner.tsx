"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

// Shows a banner at the top when the user is in guest mode
export function GuestBanner() {
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsGuest(document.cookie.includes("hireon-guest=true"));
  }, []);

  if (!isGuest) return null;

  function handleExit() {
    document.cookie = "hireon-guest=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <div className="flex items-center justify-between bg-[var(--primary)] px-4 py-2 text-xs text-white">
      <p>
        You&apos;re browsing as a guest. Data won&apos;t be saved.{" "}
        <Link href="/login" onClick={handleExit} className="underline font-medium">
          Sign in
        </Link>{" "}
        to save your progress.
      </p>
      <button onClick={handleExit} className="rounded p-1 hover:bg-white/20">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
