"use client";

import AppList, { CryptoApp } from "@/components/AppList";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [view, setView] = useState<"list" | "card">("list");
  const [cryptoApps, setCryptoApps] = useState<CryptoApp[]>([]);

  const handleLike = (id: string) => {
    console.log("Liked", id);
    window.location.href = "https://jokerace.io/contest/base/0x7f4e1f8d7b626d5120008daedcea921060ebfb68";
  };

  return (
    <div className="container mx-auto p-4 px-36">
      <Link
        href="/jokerace-leaderboard"
        className="mt-4 block text-blue-500 hover:underline"
      >
        View JokeRace Leaderboard
      </Link>
      <main className="pt-6  2xl:px-20">
        <div className="flex justify-between items-center border-b mb-6 pb-3">
          <h2 className="text-2xl font-bold mb-4">Crypto Apps On Your Radar</h2>
          <div className="flex justify-end mb-1 gap-2 items-center">
            <button
              className={clsx(
                "opacity-60 px-3 py-2 rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex",
                view == "list" ? "sign-in-button" : " hover:bg-[#f5f5f5]"
              )}
              onClick={() => setView("list")}
            >
              List
            </button>
            <button
              className={clsx(
                "opacity-60 px-3 py-2 rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex",
                view == "card" ? "sign-in-button" : " hover:bg-[#f5f5f5]"
              )}
              onClick={() => setView("card")}
            >
              Card
            </button>
          </div>
        </div>

        <AppList view={view} contractAddress="0x7f4e1f8d7b626d5120008daedcea921060ebfb68" onLike={handleLike} />
      </main>
    </div>
  );
}

export default App;
