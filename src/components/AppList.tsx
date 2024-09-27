// @ts-nocheck
import React, { useState, useEffect, useRef, MouseEvent, useMemo } from "react";
import { useContractRead, useContractReads } from "wagmi";
import { formatEther } from "ethers";
import { base } from "viem/chains";
import contractABIJson from "../utils/abi.json";
import Image from "next/image";
import clsx from "clsx";
import { AppOverlay } from "./AppOverlay";
import DOMPurify from "isomorphic-dompurify";

const contractAddress = "0x7f4e1f8d7b626d5120008daedcea921060ebfb68";
const contractABI = contractABIJson.abi;
const DESCRIPTION_MAX_LENGTH_PREVIEW = 200;

export interface CryptoApp {
  id: string;
  name: string;
  description: string;
  descriptionHTML: string;
  logo: string;
  likes: string;
  dislikes: string;
  screenshot: string[];
  liked: boolean;
  comments: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }[];
  author: string;
  exists: boolean;
  targetAddress: string;
  safeSigners: string[];
  safeThreshold: string;
  fieldsMetadata: any;
}

interface AppListProps {
  view: "list" | "card";
  cryptoApps: CryptoApp[];
}


const AppList: React.FC<AppListProps> = ({ view }) => {
  const parseContractData = (data: any[]): CryptoApp[] => {
    const generateAbstractLogo = (seed: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "/placeholder-logo.png";

      const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
      const seedNumber = seed
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

      ctx.fillStyle = colors[seedNumber % colors.length];
      ctx.fillRect(0, 0, 100, 100);

      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[(seedNumber + i) % colors.length];
        ctx.beginPath();
        ctx.arc(
          Math.sin(seedNumber + i) * 30 + 50,
          Math.cos(seedNumber + i) * 30 + 50,
          20,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      return canvas.toDataURL();
    };

    return data.map((item) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(item.description, "text/html");

      // Extract the text content with improved formatting
      const extractFormattedText = (element: Element): string => {
        let text = "";
        element.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent?.trim() + " ";
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = (node as Element).tagName.toLowerCase();
            const innerText = extractFormattedText(node as Element);
            switch (tagName) {
              case "p":
              case "div":
              case "h1":
              case "h2":
              case "h3":
              case "h4":
              case "h5":
              case "h6":
                text += innerText.trim() + ". ";
                break;
              case "li":
                text += "• " + innerText.trim() + ". ";
                break;
              case "br":
                text += "\n";
                break;
              default:
                text += innerText + " ";
            }
          }
        });
        return text.trim();
      };

      const textContent = extractFormattedText(doc.body);

      // More robust title extraction
      let title = "";

      // Check for the first paragraph or heading
      const firstElement = doc.querySelector("p, h1, h2, h3, h4, h5, h6");
      if (firstElement && firstElement.textContent) {
        title = firstElement.textContent.trim();
      }

      // If no suitable title found, use the first sentence
      if (!title) {
        const textContent = doc.body.textContent || "";
        const firstSentence = textContent.split(/[.!?]+/)[0].trim();
        if (firstSentence.length > 0 && firstSentence.length <= 50) {
          title = firstSentence;
        }
      }

      // If no title found in HTML structure, use the first sentence of the description
      if (!title) {
        const firstSentence = textContent.split(/[.!?]+/)[0].trim();
        if (firstSentence.length > 3 && firstSentence.length <= 50) {
          title = firstSentence;
        }
      }

      // If still no title, use the first sentence as the title
      if (!title) {
        const firstSentence = textContent.split(/[.!?]+/)[0].trim();
        if (firstSentence.length > 0) {
          title = firstSentence;
        }
      }

      if (!title) {
        // First, try to extract from HTML structure
        const strongTags = doc.querySelectorAll("p strong, strong");
        for (const tag of strongTags) {
          if (tag.textContent && tag.textContent.trim().length > 0) {
            title = tag.textContent.trim();
            break;
          }
        }
      }

      // Extract image URL
      const imageUrl = doc.querySelector("img")?.getAttribute("src");

      // Sanitize the HTML to prevent XSS attacks
      const sanitizedHTML = DOMPurify.sanitize(doc.body.innerHTML);

      return {
        id: item.id,
        name: title,
        description: textContent, // Use the extracted formatted text content here
        descriptionHTML: sanitizedHTML,
        logo: imageUrl || generateAbstractLogo(`${item.id}logo`),
        likes: item.likes.toString(),
        dislikes: item.dislikes ? item.dislikes.toString() : "0",
        screenshot: imageUrl ? [imageUrl] : [],
        liked: false,
        comments: item.comments.map((comment) => ({
          ...comment,
          timestamp:
            comment.timestamp === "Invalid Date"
              ? "Unknown"
              : comment.timestamp,
        })),
        author: item.author,
        exists: item.exists || true,
        targetAddress: item.targetAddress || "",
        safeSigners: item.safeSigners || [],
        safeThreshold: item.safeThreshold ? item.safeThreshold.toString() : "0",
        fieldsMetadata: item.fieldsMetadata || {},
      };
    });
  };

  const [data, setData] = useState<any[]>([]);
  const [processedComments, setProcessedComments] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  /** Step 1: Fetch proposal IDs **/
  const {
    data: proposalIds,
    isLoading: isLoadingProposalIds,
    isError: isProposalIdsError,
    error: proposalIdsError,
  } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: "getAllProposalIds",
    chainId: base.id,
  });

  /** Step 2: Fetch proposals, votes, and comments **/
  const enabled = proposalIds && proposalIds.length > 0;

  const {
    data: proposalsData,
    isLoading: isLoadingProposals,
    isError: isProposalsError,
    error: proposalsError,
  } = useContractReads({
    contracts: proposalIds
      ? proposalIds.map((id) => ({
          address: contractAddress,
          abi: contractABI,
          functionName: "getProposal",
          args: [id],
          chainId: base.id,
        }))
      : [],
    enabled,
  });

  const {
    data: votesData,
    isLoading: isLoadingVotes,
    isError: isVotesError,
    error: votesError,
  } = useContractReads({
    contracts: proposalIds
      ? proposalIds.map((id) => ({
          address: contractAddress,
          abi: contractABI,
          functionName: "proposalVotes",
          args: [id],
          chainId: base.id,
        }))
      : [],
    enabled,
  });

  const {
    data: commentIds,
    isLoading: isLoadingComments,
    isError: isCommentsError,
    error: commentsError,
  } = useContractReads({
    contracts: proposalIds
      ? proposalIds.map((id) => ({
          address: contractAddress,
          abi: contractABI,
          functionName: "getProposalComments",
          args: [id],
          chainId: base.id,
        }))
      : [],
    enabled,
  });

  // New hook to fetch comment data
  const {
    data: commentData,
    isLoading: isLoadingCommentData,
    isError: isCommentDataError,
    error: commentDataError,
  } = useContractReads({
    contracts: commentIds
      ? commentIds.flatMap((res, index) => {
          const commentIdsForProposal = res.result;

          return commentIdsForProposal
            ? commentIdsForProposal.map((commentId) => ({
                address: contractAddress,
                abi: contractABI,
                functionName: "getComment",
                args: [commentId],
                chainId: base.id,
              }))
            : [];
        })
      : [],
    enabled: !!commentIds,
  });

  useEffect(() => {
    if (commentData) {
      console.log("commentData", commentData);
      const processedComments = commentData.map((_comment, index) => {
        const comment = _comment.result;

        return {
          proposalId: comment.proposalId,
          author: comment.author,
          content: comment.commentContent,
          timestamp: new Date(
            Number(comment.timestamp) * 1000
          ).toLocaleString(),
        };
      });
      console.log("done processing comments", processedComments);
      setProcessedComments(processedComments);
    }
  }, [commentData]);

  useEffect(() => {
    if (
      proposalsData &&
      votesData &&
      commentIds &&
      proposalIds &&
      processedComments
    ) {
      const processedData = proposalIds.map((proposalId, index) => {
        const proposal = proposalsData[index].result;
        const votes = votesData[index].result;

        const likes = votes?.[0]
          ? parseFloat(formatEther(votes[0])).toFixed(2)
          : "0";
        const dislikes = votes?.[1]
          ? parseFloat(formatEther(votes[1])).toFixed(2)
          : "0";

        const proposalComments = processedComments.filter(
          (comment) => comment.proposalId === proposalId
        );

        return {
          id: proposalId,
          name: proposal.description,
          description: proposal.description,
          logo: "/placeholder-logo.png",
          likes,
          dislikes,
          screenshot: ["/placeholder-screenshot.png"],
          liked: false,
          comments: proposalComments,
          author: proposal.author,
          exists: proposal.exists,
          targetAddress: proposal.targetMetadata?.targetAddress || "",
          safeSigners: proposal.safeMetadata?.safeSigners || [],
          safeThreshold:
            proposal.safeMetadata?.safeThreshold?.toString() || "0",
          fieldsMetadata: proposal.fieldsMetadata,
        };
      });

      const parsedData = parseContractData(processedData);
      setData(parsedData);
    }
  }, [proposalsData, votesData, commentIds, proposalIds, processedComments]);

  const [selectedApp, setSelectedApp] = useState<CryptoApp | null>(null);
  const [heartBubbles, setHeartBubbles] = useState<
    { x: number; y: number; id: string; path: string }[]
  >([]);
  const heartButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredApp, setHoveredApp] = useState<CryptoApp | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleLike = async (appId: string) => {
   window.location.href = "https://jokerace.io/contest/base/0x7f4e1f8d7b626d5120008daedcea921060ebfb68"
    // Implement like functionality here
    /*setData((prevData) =>
      prevData.map((app) =>
        app.id === appId
          ? { ...app, likes: (parseFloat(app.likes) + 1).toString() }
          : app
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
      */
  };

  const handleAppClick = (app: CryptoApp) => {
    setSelectedApp(app);
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const likesA = parseFloat(a.likes);
      const likesB = parseFloat(b.likes);
      return sortOrder === "desc" ? likesB - likesA : likesA - likesB;
    });
  }, [data, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === "desc" ? "asc" : "desc"));
  };

  const renderAppItem = (app: CryptoApp) => {
    const truncateDescription = (description: string, maxLength: number) => {
      if (description.length <= maxLength) return description;
      return description.slice(0, maxLength) + "...";
    };

    const truncatedDescription = truncateDescription(
      app.description,
      DESCRIPTION_MAX_LENGTH_PREVIEW
    );

    const renderDescription = (description: string) => {
      return description.split("\n\n").map((paragraph, index) => (
        <p key={index} className="text-sm text-gray-600 mt-2">
          {paragraph}
        </p>
      ));
    };

    return (
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
                <div className="pr-24">
                  {renderDescription(truncatedDescription)}
                </div>
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
                <span className="ml-1 text-yellow-400">
                  {Math.floor(parseFloat(app.likes))}
                </span>
              </button>
            </div>
            {hoveredApp && hoveredApp.id === app.id && (
              <div
                className="fixed z-10 bg-[#FAFAFA] shadow-lg rounded-lg  w-96 overflow-hidden"
                style={{
                  left: `${mousePosition.x + 16}px`,
                  top: `${mousePosition.y + 16}px`,
                }}
              >
                {app.screenshot && app.screenshot.length > 0 && (
                  <div className="relative mb-2 rounded-2xl overflow-hidden w-full ">
                    <Image
                      src={app.screenshot[0]}
                      alt={`${app.name} screenshot`}
                      width={240}
                      height={120}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold truncate">{app.name}</h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-6 overflow-ellipsis">
                    {app.description}
                  </p>
                 
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col border-gray-50 border p-1 shadow-md hover:shadow-xl transition-all duration-300 rounded-lg">
            <div className="relative mb-4 rounded-lg overflow-hidden aspect-video ">
              <Image
                src={app.screenshot[0] || "/Placeholder.png"}
                alt={`${app.name} screenshot`}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex items-start px-4 2xl:px-4  pb-4 ">
              <div className="flex-grow min-w-0">
                <h3 className="text-lg font-semibold truncate">{app.name}</h3>
                <div className="line-clamp-2 text-xs overflow-hidden text-ellipsis">
                  {renderDescription(truncatedDescription)}
                </div>
              </div>
              <button
                className="flex flex-col -translate-y-3 translate-x-3 justify-center items-center ml-2 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(app.id);
                }}
                ref={heartButtonRef}
              >
                <div className="w-16 h-16 relative">
                  <Image
                    alt="heart"
                    src="/Marshki.png"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="mt-1 text-xs text-yellow-400 whitespace-nowrap">
                  {Math.floor(parseFloat(app.likes))}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /** Step 4: Handle loading and error states **/
  if (
    isLoadingProposalIds ||
    isLoadingProposals ||
    isLoadingVotes ||
    isLoadingComments
  ) {
    return <div>Loading...</div>;
  }

  if (
    isProposalIdsError ||
    isProposalsError ||
    isVotesError ||
    isCommentsError
  ) {
    return (
      <div>
        Error:{" "}
        {proposalIdsError?.message ||
          proposalsError?.message ||
          votesError?.message ||
          commentsError?.message}
      </div>
    );
  }

  /** Step 5: Render the data **/
  return (
    <div className="app-list-container">
      <div className="mb-4">
   

        <button
          onClick={toggleSortOrder}
          className="px-4 py-2 text-[#b98000] font-medium sign-in-button rounded-[38px] cursor-pointer transition-all justify-center items-center gap-2.5 inline-flex"
        > 
          Sort by Votes:{" "}
          {sortOrder === "desc" ? "Highest First" : "Lowest First"}
        </button>
      </div>
      <div
        className={clsx(
          view === "list"
            ? "space-y-4"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}
      >
        {sortedData.map(renderAppItem)}
      </div>
      {selectedApp && (
        <AppOverlay
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onLike={handleLike}
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
