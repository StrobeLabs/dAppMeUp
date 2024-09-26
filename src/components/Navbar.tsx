import Image from "next/image";
import React from "react";

function Navbar() {
  return (
    <header className="flex justify-between items-center mb-6 border-b pb-3 px-44 p-6">
      <div className="flex items-center">
        <Image
          unoptimized
          priority
          src="/DappLogo.png"
          alt="dApp Me Up Logo"
          className="mr-2"
          width={120}
          height={120}
        />
      </div>
      <div className="flex gap-2">
        <div className="px-4 py-2 sign-in-button rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex">
          <div className="text-[#b98000] text-md tracking-tight  ">
            Sign In
          </div>
        </div>
        <div className="px-4 py-2 sign-up-button rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex">
          <div className="text-white text-md tracking-tight">Sign Up</div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
