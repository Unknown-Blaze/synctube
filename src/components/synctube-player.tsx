"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2, Users, Copy, Check, Crown, Link2, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface User {
  id: string;
  username: string;
  isHost?: boolean;
}

export default function SyncTubePlayer() {
  const [inputVideoId, setInputVideoId] = useState(DEFAULT_VIDEO_ID);
  const [videoId, setVideoId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const [playerStatus, setPlayerStatus] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Party/Room state
  const [partyId, setPartyId] = useState("");
  const [inputPartyId, setInputPartyId] = useState("");
  const [username, setUsername] = useState("");
  const [isInParty, setIsInParty] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const { toast } = useToast();
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Socket.IO connection and event handlers
  useEffect(() => {
    if (!isMounted || !isInParty) return;

    const socket = connectSocket();
    if (!socket) return; // Guard against SSR
    
    socketRef.current = socket;

    // Listen for room state
    socket.on('room-state', ({ videoId: roomVideoId, users: roomUsers, hostId }) => {
      if (roomVideoId) {
        setVideoId(roomVideoId);
        setInputVideoId(roomVideoId);
      }
      setUsers(roomUsers);
      // Check if current user is host
      setIsHost(socket.id === hostId);
    });

    // Listen for video changes
    socket.on('video-changed', ({ videoId: newVideoId }) => {
      setVideoId(newVideoId);
      setInputVideoId(newVideoId);
      toast({
        title: "Video changed",
        description: `Now playing: ${newVideoId}`,
      });
    });

    // Listen for sync play
    socket.on('play-synced', ({ targetTime }) => {
      setIsSyncing(true);
      const delay = targetTime - Date.now();
      
      setTimeout(() => {
        playerRef.current?.playVideo();
        setIsSyncing(false);
      }, delay > 0 ? delay : 0);
    });

    // Listen for pause
    socket.on('paused', () => {
      playerRef.current?.pauseVideo();
    });

    // Listen for seek
    socket.on('seeked', ({ currentTime }) => {
      if (playerRef.current && typeof (playerRef.current as any).seekTo === 'function') {
        (playerRef.current as any).seekTo(currentTime, true);
      }
    });

    // Listen for user joined
    socket.on('user-joined', ({ username: joinedUser, users: updatedUsers }) => {
      setUsers(updatedUsers);
      toast({
        title: "User joined",
        description: `${joinedUser} joined the party`,
      });
    });

    // Listen for user left
    socket.on('user-left', ({ username: leftUser, users: updatedUsers }) => {
      setUsers(updatedUsers);
      toast({
        title: "User left",
        description: `${leftUser} left the party`,
      });
    });

    // Listen for sync confirmation
    socket.on('synced-to-time', ({ currentTime, shouldPlay }) => {
      console.log('Received sync-to-time event:', currentTime, shouldPlay);
      if (playerRef.current && typeof (playerRef.current as any).seekTo === 'function') {
        (playerRef.current as any).seekTo(currentTime, true);
        if (shouldPlay) {
          setTimeout(() => playerRef.current?.playVideo(), 100);
        }
      }
    });

    return () => {
      socket.off('room-state');
      socket.off('video-changed');
      socket.off('play-synced');
      socket.off('paused');
      socket.off('seeked');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('synced-to-time');
    };
  }, [isMounted, isInParty, toast]);

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

  // Track current time
  useEffect(() => {
    if (playerRef.current && videoId) {
      timeUpdateInterval.current = setInterval(() => {
        const time = (playerRef.current as any)?.getCurrentTime?.();
        if (typeof time === 'number') {
          setCurrentTime(time);
        }
      }, 500);
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [videoId, playerRef.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInParty) {
        disconnectSocket();
      }
    };
  }, [isInParty]);

  const generatePartyId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateParty = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to create a party",
        variant: "destructive",
      });
      return;
    }
    const newPartyId = generatePartyId();
    setPartyId(newPartyId);
    setInputPartyId(newPartyId);
    joinParty(newPartyId);
  };

  const handleJoinParty = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to join a party",
        variant: "destructive",
      });
      return;
    }
    if (!inputPartyId.trim()) {
      toast({
        title: "Party ID required",
        description: "Please enter a party ID to join",
        variant: "destructive",
      });
      return;
    }
    setPartyId(inputPartyId);
    joinParty(inputPartyId);
  };

  const joinParty = (id: string) => {
    const socket = connectSocket();
    if (!socket) return; // Guard against SSR
    
    socket.emit('join-party', { partyId: id, username });
    setIsInParty(true);
    toast({
      title: "Joined party",
      description: `You're now in party: ${id}`,
    });
  };

  const handleLeaveParty = () => {
    disconnectSocket();
    setIsInParty(false);
    setPartyId("");
    setUsers([]);
    toast({
      title: "Left party",
      description: "You've left the party",
    });
  };

  const copyPartyId = () => {
    navigator.clipboard.writeText(partyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Party ID copied to clipboard",
    });
  };

  // Extract video ID from YouTube URL or return as-is if already an ID
  const extractVideoId = (input: string): string | null => {
    const trimmed = input.trim();
    
    // Already a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    
    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const handleSyncToMe = () => {
    if (!playerRef.current || !socketRef.current) {
      console.log('Cannot sync: player or socket not ready');
      toast({
        title: "Error",
        description: "Player not ready",
        variant: "destructive"
      });
      return;
    }
    
    const time = (playerRef.current as any).getCurrentTime?.() || 0;
    const isPlaying = playerStatus === window.YT?.PlayerState.PLAYING;
    
    console.log('Socket connected:', socketRef.current.connected);
    console.log('Emitting sync-to-time:', { partyId, currentTime: time, shouldPlay: isPlaying });
    
    socketRef.current.emit('sync-to-time', { 
      partyId, 
      currentTime: time,
      shouldPlay: isPlaying
    }, (response: any) => {
      console.log('Server acknowledged sync-to-time:', response);
    });
    
    toast({
      title: "Syncing everyone",
      description: `Bringing everyone to ${Math.floor(time)}s`,
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadVideo = () => {
    const extractedId = extractVideoId(inputVideoId);
    
    if (extractedId) {
      setVideoId(extractedId);
      
      // Broadcast to party if in one
      if (isInParty && socketRef.current) {
        socketRef.current.emit('change-video', { partyId, videoId: extractedId });
      }
    } else {
      toast({
        title: "Invalid video",
        description: "Please enter a valid YouTube URL or video ID",
        variant: "destructive",
      });
    }
  };
  
  const handlePlaySync = () => {
    if (!playerRef.current) return;
    
    setIsSyncing(true);
    
    // Calculate target time 2 seconds in the future
    const targetTime = Date.now() + 2000;
    
    // Broadcast to party if in one
    if (isInParty && socketRef.current) {
      socketRef.current.emit('sync-play', { partyId, targetTime });
    } else {
      // Local play if not in party
      const delay = targetTime - Date.now();
      setTimeout(() => {
        playerRef.current?.playVideo();
        setIsSyncing(false);
      }, delay > 0 ? delay : 0);
    }
  };
  
  const handlePause = () => {
    if (!playerRef.current) return;
    
    playerRef.current.pauseVideo();
    
    // Broadcast to party if in one
    if (isInParty && socketRef.current) {
      const currentTime = (playerRef.current as any).getCurrentTime?.() || 0;
      socketRef.current.emit('pause', { partyId, currentTime });
    }
  };

  if (!isMounted) {
    return null; // Or a loading spinner
  }

  const isPlaying = playerStatus === window.YT?.PlayerState.PLAYING;
  const isBuffering = playerStatus === window.YT?.PlayerState.BUFFERING;
  const isPlayerActive = isPlaying || isBuffering;

  // Show party join UI if not in a party
  if (!isInParty) {
    return (
      <Card className="w-full max-w-2xl shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary">
            SyncTube
          </CardTitle>
          <CardDescription className="text-center text-base">
            Watch YouTube videos in perfect sync with friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create">Create Party</TabsTrigger>
              <TabsTrigger value="join">Join Party</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4">
              <Alert>
                <Crown className="h-4 w-4" />
                <AlertDescription>
                  You'll be the host and control playback for everyone
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <label htmlFor="username-create" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="username-create"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && username.trim() && handleCreateParty()}
                  autoFocus
                />
              </div>
              <Button 
                onClick={handleCreateParty} 
                className="w-full"
                size="lg"
                disabled={!username.trim()}
              >
                <Crown className="mr-2 h-4 w-4" />
                Create Party
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4">
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Get the party ID from your friend to join their session
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <label htmlFor="username-join" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="username-join"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="partyId" className="text-sm font-medium">
                  Party ID
                </label>
                <Input
                  id="partyId"
                  type="text"
                  placeholder="e.g. A3X9K2"
                  value={inputPartyId}
                  onChange={(e) => setInputPartyId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && username.trim() && inputPartyId.trim() && handleJoinParty()}
                />
              </div>
              <Button 
                onClick={handleJoinParty} 
                className="w-full" 
                size="lg"
                disabled={!username.trim() || !inputPartyId.trim()}
              >
                <Users className="mr-2 h-4 w-4" />
                Join Party
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl shadow-2xl shadow-primary/10">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary">
              SyncTube
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-sm font-mono bg-muted px-3 py-1 rounded">{partyId}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPartyId}
                className="h-7 px-2"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLeaveParty}
          >
            Leave Party
          </Button>
        </div>
        
        {users.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {users.map((user) => (
              <Badge 
                key={user.id} 
                variant={user.isHost ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {user.isHost && <Crown className="h-3 w-3" />}
                {user.username}
              </Badge>
            ))}
            <Badge variant="outline" className="ml-auto">
              <Users className="h-3 w-3 mr-1" />
              {users.length} {users.length === 1 ? 'person' : 'people'}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            YouTube Video
          </label>
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Paste YouTube URL or video ID"
              value={inputVideoId}
              onChange={(e) => setInputVideoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
            />
            <Button onClick={handleLoadVideo} size="lg">
              Load
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <div className="aspect-video w-full bg-card-foreground/5 rounded-lg overflow-hidden flex items-center justify-center relative border-2 border-border">
          {videoId ? (
            <>
              <div id="youtube-player" className="w-full h-full" />
              {currentTime > 0 && (
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(currentTime)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground space-y-2">
              <Link2 className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-sm">Paste a YouTube URL above to get started</p>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handlePlaySync} 
            disabled={!videoId || isSyncing || isPlayerActive}
            size="lg"
            variant="default"
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Play Together'}
          </Button>
          
          <Button 
            onClick={handlePause} 
            disabled={!videoId || !isPlayerActive}
            variant="secondary"
            size="lg"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause All
          </Button>
        </div>

        {/* Sync Controls */}
        {videoId && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">SYNC CONTROLS</p>
            <Button 
              onClick={handleSyncToMe}
              variant="outline"
              className="w-full"
              disabled={!videoId}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Everyone to My Position
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Use this if someone is out of sync - brings everyone to your current time
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
