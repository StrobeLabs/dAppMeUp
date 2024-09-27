// @ts-nocheck
"use client";

import { ChevronLeft, ChevronRight, Heart, Trophy, X } from "lucide-react";
import Image from "next/image";
import { CryptoApp } from "./AppList";
import { useCallback, useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import DOMPurify from "isomorphic-dompurify";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  val: number;
  image: string;
  x?: number;
  y?: number;
}

const AbstractAvatarSVG = ({ seed }: { seed: number }) => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    "#F06292", "#AED581", "#FFD54F", "#4DB6AC", "#7986CB"
  ];

  const getColor = (index: number) => colors[index % colors.length];

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill={getColor(seed)} />
      <circle cx="12" cy="8" r="4" fill={getColor(seed + 1)} />
      <rect x="4" y="14" width="16" height="6" fill={getColor(seed + 2)} />
    </svg>
  );
};

export const AppOverlay = ({
  app,
  onClose,
  onLike,
}: {
  app: CryptoApp;
  onClose: () => void;
  onLike: (appId: string) => void;
}) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [likesCount, setLikesCount] = useState(
    Math.floor(parseFloat(app.likes))
  );

  useEffect(() => {
    const newNodes = Array.from({ length: parseInt(app.likes) }, (_, i) => ({
      id: `node${i}`,
      val: Math.random() * 20 + 3,
      image: "/Character.png",
    }));
    setNodes(newNodes);
  }, [app.likes]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 800;
    const height = 200;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force(
        "collision",
        d3.forceCollide().radius((d) => (d as Node).val)
      )
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height * 0.6).strength(0.1));

    const nodeElements = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("g");

    nodeElements
      .append("circle")
      .attr("r", (d: Node) => d.val)
      .attr("fill", "#FFA500")
      .attr("stroke", "#FFA500")
      .attr("stroke-width", 2);

    nodeElements
      .append("image")
      .attr("xlink:href", (d: Node) => d.image)
      .attr("x", (d: Node) => -d.val)
      .attr("y", (d: Node) => -d.val)
      .attr("width", (d: Node) => d.val * 2)
      .attr("height", (d: Node) => d.val * 2)
      .attr("clip-path", (d: Node) => `circle(${d.val}px)`);

    simulation.on("tick", () => {
      nodeElements.attr("transform", (d: Node) => `translate(${d.x},${d.y})`);
    });

    const drag = d3
      .drag<SVGGElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    return () => {
      simulation.stop();
    };
  }, [nodes]);

  const closeOverlay = () => {
    onClose();
  };

  const handleLike = useCallback(() => {
    onLike(app.id);
   //  setLikesCount((prevCount) => prevCount + 1);
    setNodes((prevNodes) => [
      ...prevNodes,
      {
        id: `node${prevNodes.length}`,
        val: Math.random() * 20 + 10,
        image: "/Character.png",
      },
    ]);
  }, [app.id, onLike]);

  // Create a sanitize function that allows anchor tags
  const sanitize = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "a", "strong", "em", "ul", "ol", "li", "img", "h3", "hr"],
      ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "width", "height"],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white overflow-x-hidden rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-start mb-4">
           
          <div className="flex items-start">
            <div>
              <h2 className="text-2xl font-bold">
                {app.name === "Untitled"
                  ? app.description.split(/[.!?]+/)[0].trim()
                  : app.name}
              </h2>
              <div
                className="mt-2 text-sm text-gray-600 description-content"
                dangerouslySetInnerHTML={{
                  __html: sanitize(app.descriptionHTML),
                }}
              />
            </div>
          </div>
          {app.award && (
            <div className="flex items-center">
              <Trophy className="text-gray-400 mr-2" />
              <span className="font-semibold text-sm">{app.award}</span>
            </div>
          )}
          <button
            onClick={closeOverlay}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
    
        {app.screenshot && app.screenshot.length > 0 && (
          <div className="relative mb-4">
            <div className="flex items-center">
              {app.screenshot.length > 1 && (
                <button
                  onClick={() => {
                    // Implement previous screenshot logic
                  }}
                  className="absolute left-0 z-10 bg-white bg-opacity-50 p-2 rounded-full"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <div className="overflow-hidden">
                <div className="flex transition-transform duration-300 ease-in-out">
                  {app.screenshot.map((screenshot, index) => (
                    <Image
                      key={index}
                      src={screenshot}
                      alt={`${app.name} screenshot ${index + 1}`}
                      width={400}
                      height={200}
                      className="object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
              {app.screenshot.length > 1 && (
                <button
                  onClick={() => {
                    // Implement next screenshot logic
                  }}
                  className="absolute right-0 z-10 bg-white bg-opacity-50 p-2 rounded-full"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>
        )}

       

        <div className="flex justify-center items-center mb-4">
          <div className="relative">
            <div className="mb-8 w-full">
              <svg ref={svgRef} width={800} height={200} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-yellow-400 likes-custom">
                {likesCount}
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mb-4">
          Voting done with Jokerace
        </p>
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Comments</h3>
          <div className="bg-gray-100 p-2 rounded-lg mb-2">
            <p className="text-sm text-gray-500">Go to JokeRace to comment.</p>
          </div>
          {app.comments.map((comment, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-center mb-1">
                <AbstractAvatarSVG seed={index} />
                <span className="font-semibold text-sm ml-2">{comment.author}</span>
                {comment.author === app.author && (
                  <span className="ml-2 px-1 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    OP
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-2">
                  {comment.timestamp}
                </span>
              </div>
              <p
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: comment.content }}
              ></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Add this style to your global CSS or use a CSS-in-JS solution
const styles = `
  .description-content img {
    max-width: 100%;
    height: auto;
    margin: 10px 0;
  }
`;

// If using CSS-in-JS, you can add this to your component
<style jsx>{styles}</style>
