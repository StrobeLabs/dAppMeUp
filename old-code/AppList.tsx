"use client";

import React, { useState, useEffect, useRef, MouseEvent } from "react";
import Image from "next/image";
import { AppOverlay } from "./AppOverlay";
import clsx from "clsx";
import { getContractData, likeProposal } from "../utils/jokerace-contract/jokerace-helper";

export interface CryptoApp {
  id: string;
  name: string;
  description: string;
  logo: string;
  likes: number;
  screenshot: string[];
  liked: boolean;
  award?: string;
  comments: { id: string; author: string; content: string; timestamp: string }[];
  author: string;
}

interface AppListProps {
  view: "list" | "card";
}

const AppList: React.FC<AppListProps> = ({ view }) => {
  const [data, setData] = useState<CryptoApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<CryptoApp | null>(null);
  const [heartBubbles, setHeartBubbles] = useState<
    { x: number; y: number; id: string; path: string }[]
  >([]);
  const heartButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredApp, setHoveredApp] = useState<CryptoApp | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const parseContractData = (data: any[]): CryptoApp[] => {
    return data.map(item => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(item.name, 'text/html');
  
      const title = doc.querySelector('p strong')?.textContent || doc.querySelector('h1')?.textContent || 'Untitled';
      const imageUrl = doc.querySelector('img')?.getAttribute('src') || '/placeholder-logo.png';
      const description = doc.body.textContent?.trim().split('\n')[0] || '';
  
      return {
        id: item.id,
        name: title,
        description: description,
        logo: imageUrl,
        likes: parseFloat(item.likes),
        screenshot: [imageUrl],
        liked: false,
        comments: item.comments.map(comment => ({
          ...comment,
          timestamp: comment.timestamp === 'Invalid Date' ? 'Unknown' : comment.timestamp
        })),
        author: item.author
      };
    });
  };

  

  useEffect(() => {
    const fetchData = async () => {
      const contractData = await getContractData();
      const parsedData = parseContractData(contractData);
      setData(parsedData);
      console.log(parsedData);
    };

    fetchData();
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleLike = async (appId: string) => {
    await likeProposal(appId);
    setData(prevData =>
      prevData.map(app =>
        app.id === appId ? { ...app, likes: app.likes + 1 } : app
      )
    );

    if (heartButtonRef.current) {
      const { left, top, width, height } =
        heartButtonRef.current.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const newBubbles = Array.from({ length: 10 }).map((_, index) => ({
        x,
        y,
        id: `heart-bubble-${heartBubbles.length + index}`,
        path: `bubble-path-${Math.floor(Math.random() * 5) + 1}`,
      }));
      setHeartBubbles([...heartBubbles, ...newBubbles]);
    }
  };

  const handleAppClick = (app: CryptoApp) => {
    setSelectedApp(app);
  };

  const handleLikeApp = (appId: string) => {
    handleLike(appId);
  };

  const renderAppItem = (app: CryptoApp) => (
    <div
      key={app.id}
      className="relative cursor-pointer"
      onClick={() => handleAppClick(app)}
      onMouseEnter={() => setHoveredApp(app)}
      onMouseLeave={() => setHoveredApp(null)}
      onMouseMove={handleMouseMove}
    >
      {view === "list" ? (
        <>
          <div className="flex items-start pb-4 transition-all ">
            <div className="w-12 h-12 mr-4 relative flex-shrink-0">
              <Image
                src={app.logo}
                alt={`${app.name} logo`}
                fill
                className="rounded-md object-cover"
              />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold">{app.name}</h3>
              <p className="text-sm text-gray-600 pr-24">{app.description}</p>
              <div className="mt-2 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-80 hover:opacity-100 transition-all h-5 w-5 text-gray-400 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs text-gray-500">
                  {app.comments?.length || 0}{" "}
                </span>
              </div>
            </div>
            <button
              className="flex items-center flex-col justify-center"
              onClick={(e) => {
                e.stopPropagation();
                handleLike(app.id);
              }}
              ref={heartButtonRef}
            >
              <Image
                alt="heart"
                src="/Marshki.png"
                className="opacity-80 hover:opacity-100 transition-all"
                width={72}
                height={72}
                unoptimized
                priority
              />
              <span className="ml-1 text-yellow-400">{app.likes}</span>
            </button>
          </div>
          {hoveredApp && hoveredApp.id === app.id && (
            <div
              className="fixed z-10 bg-white shadow-lg rounded-lg p-4 w-64"
              style={{
                left: `${mousePosition.x + 16}px`,
                top: `${mousePosition.y + 16}px`,
              }}
            >
              <div className="relative mb-2 rounded-lg overflow-hidden">
                <Image
                  src={app.screenshot[0]}
                  alt={`${app.name} screenshot`}
                  width={240}
                  height={120}
                  className="object-cover"
                />
              </div>
              <h3 className="text-lg font-semibold">{app.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{app.description}</p>
              <div className="flex items-center mt-2">
                <Image alt="heart" src="/Marshki.png" width={16} height={16} />
                <span className="ml-1 text-yellow-400">{app.likes}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col">
          <div className="relative mb-2 rounded-lg overflow-hidden">
            <Image
              src={app.screenshot[0]}
              alt={`${app.name} screenshot`}
              width={400}
              height={192}
              className="object-cover"
            />
          </div>
          <div className="flex items-start">
            <div className="w-10 h-10 mr-2 relative flex-shrink-0">
              <Image
                src={app.logo}
                alt={`${app.name} logo`}
                fill
                className="rounded-md object-cover"
              />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold">{app.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{app.description}</p>
            </div>
            <button
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleLike(app.id);
              }}
              ref={heartButtonRef}
            >
              <Image alt="heart" src="/Marshki.png" width={16} height={16} />
              <span className="ml-1 text-yellow-400">{app.likes}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-list-container">
      <div
        className={clsx(
          view === "list"
            ? "space-y-4"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}
      >
        {data.map(renderAppItem)}
      </div>
      {selectedApp && (
        <AppOverlay
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onLike={handleLikeApp}
        />
      )}
      {heartBubbles.map((bubble, index) => (
        <div
          key={index}
          className={clsx(
            `heart-bubble absolute bg-yellow-500 rounded-full w-4 h-4 ${bubble.path}`
          )}
          style={{ left: bubble.x, top: bubble.y }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
};

export default AppList;