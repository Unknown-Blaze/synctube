"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// TypeScript interfaces for the YouTube Player API
// This avoids needing to install @types/youtube
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (id: string, options: any) => YT.Player;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      }
    };
  }
}

namespace YT {
  export interface Player {
    playVideo: () => void;
    pauseVideo: () => void;
    getPlayerState: () => number;
    destroy: () => void;
  }
}

const DEFAULT_VIDEO_ID = "dQw4w9WgXcQ"; // A classic choice

export default function SyncTubePlayer() {
  const [inputVideoId, setInputVideoId] = useState(DEFAULT_VIDEO_ID);
  const [videoId, setVideoId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const [playerStatus, setPlayerStatus] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check if the script is already loaded
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }
    
    // Define the global callback function
    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    // Load the IFrame Player API code asynchronously.
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Cleanup on unmount
    return () => {
      // @ts-ignore
      delete window.onYouTubeIframeAPIReady;
      // Note: We don't remove the script tag as other components might use it.
    };
  }, [isMounted]);

  useEffect(() => {
    if (isApiReady && videoId && isMounted) {
      // If a player instance exists, destroy it before creating a new one
      playerRef.current?.destroy();
      
      const player = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            // Player is ready
          },
          onStateChange: (event: { data: number }) => {
            setPlayerStatus(event.data);
          },
        },
      });
      playerRef.current = player;
    }

    return () => {
      // Cleanup player on component unmount or videoId change
      if (playerRef.current) {
        // Checking if destroy is a function before calling
        if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
        }
        playerRef.current = null;
      }
    };
  }, [isApiReady, videoId, isMounted]);

  const handleLoadVideo = () => {
    // Basic validation for YouTube video ID
    const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    if (videoIdPattern.test(inputVideoId)) {
      setVideoId(inputVideoId);
    } else {
      // In a real app, show an error toast
      console.error("Invalid YouTube Video ID");
    }
  };
  
  const handlePlaySync = () => {
    if (!playerRef.current) return;
    
    setIsSyncing(true);
    
    // Simulate server request and response delay
    const targetTime = Date.now() + 2000;
    
    const delay = targetTime - Date.now();
    
    setTimeout(() => {
      playerRef.current?.playVideo();
      setIsSyncing(false);
    }, delay > 0 ? delay : 0);
  };
  
  const handlePause = () => {
    if (!playerRef.current) return;
    playerRef.current.pauseVideo();
  };

  if (!isMounted) {
    return null; // Or a loading spinner
  }

  const isPlaying = playerStatus === window.YT?.PlayerState.PLAYING;
  const isBuffering = playerStatus === window.YT?.PlayerState.BUFFERING;
  const isPlayerActive = isPlaying || isBuffering;

  return (
    <Card className="w-full max-w-2xl shadow-2xl shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary">
          SyncTube
        </CardTitle>
        <CardDescription className="text-center">
          Enter a YouTube video ID to start listening with friends in perfect sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="e.g. dQw4w9WgXcQ"
            value={inputVideoId}
            onChange={(e) => setInputVideoId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
          />
          <Button onClick={handleLoadVideo}>Load</Button>
        </div>
        <div className="aspect-video w-full bg-card-foreground/5 rounded-md overflow-hidden flex items-center justify-center">
          {videoId ? (
            <div id="youtube-player" className="w-full h-full" />
          ) : (
            <div className="text-muted-foreground">
              <p>Load a video to begin</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center space-x-4">
        <Button 
          onClick={handlePlaySync} 
          disabled={!videoId || isSyncing || isPlayerActive}
          className="w-36"
        >
          {isSyncing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Sync Play
            </>
          )}
        </Button>
        <Button 
          onClick={handlePause} 
          disabled={!videoId || !isPlayerActive}
          variant="secondary"
          className="w-36"
        >
          <Pause className="mr-2 h-4 w-4" /> Pause
        </Button>
      </CardFooter>
    </Card>
  );
}
