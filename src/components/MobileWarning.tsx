"use client";
import React from 'react';

const MobileWarning: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black  backdrop-blur-2xl bg-opacity-50 z-50 flex items-center justify-center p-4 sm:hidden">
      <div className="bg-white rounded-lg p-6 max-w-sm ">
        <h2 className="text-xl font-bold mb-4">Mobile Not Supported</h2>
        <p className="mb-4">We apologize, but this application is not currently supported on mobile devices. Please use a desktop browser for the best experience.</p>
        <div className="px-4 py-2 sign-in-button rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex">
          <div className="text-[#b98000] text-md tracking-tight  ">I understand</div>
        </div>
      </div>
    </div>
  );
};

export default MobileWarning;