# SyncTube Party Sync Setup

## ✅ What's Been Implemented

Your SyncTube app now has **full real-time party synchronization**! Multiple users can:

- ✅ Create and join parties with unique party IDs
- ✅ Watch the same YouTube video in perfect sync
- ✅ See who's in the party in real-time
- ✅ Sync play/pause across all party members
- ✅ Change videos that update for everyone
- ✅ Auto-disconnect handling when users leave

## 🚀 How to Run

1. **Start the server with Socket.IO:**
   ```cmd
   npm run dev
   ```

2. **Open multiple browser windows/tabs:**
   - Go to `http://localhost:9002` in each window

3. **Test the party sync:**
   - In the first window: Enter a username and click "Create Party"
   - Copy the Party ID that appears
   - In other windows: Enter usernames and paste the Party ID, then click "Join Party"
   - Load a video (use any YouTube video ID like `dQw4w9WgXcQ`)
   - Click "Sync Play" - all users will start playing at the exact same time!
   - Try pause, and loading different videos - everything syncs!

## 🎯 Key Features

### Party Management
- **Create Party**: Generates a unique 6-character party code
- **Join Party**: Enter an existing code to join friends
- **Leave Party**: Exit the party and disconnect
- **Party ID Sharing**: Copy button to easily share with friends

### Sync Capabilities
- **Sync Play**: Coordinates playback to start at the same moment for everyone (2-second countdown)
- **Pause**: Pauses for all party members instantly
- **Video Changes**: When anyone loads a new video, it updates for everyone
- **User Presence**: See who's in the party with live user count and badges

### Real-time Events
- Notifications when users join/leave
- Live user list with badges
- Toast notifications for all actions
- Automatic reconnection handling

## 🏗️ Architecture

### Backend (`server.js`)
- Custom Node.js server with Socket.IO
- Manages party rooms and state
- Broadcasts events to all connected clients
- Handles user presence and disconnections

### Frontend (`src/components/synctube-player.tsx`)
- Socket.IO client connection
- Party UI with create/join flows
- Real-time event listeners
- YouTube IFrame API integration

### Socket Events
- `join-party` - User joins a room
- `change-video` - Video changes for all
- `sync-play` - Coordinated playback start
- `pause` - Pause for everyone
- `user-joined` / `user-left` - Presence updates

## 🎨 UI Updates

- Party creation/join screen
- Party ID display with copy button
- User count badge
- User list with badges
- Leave party button
- Toast notifications

## 📝 Notes

- Socket.IO and socket.io-client are already installed in your package.json
- The dev script now runs the custom server instead of standard Next.js dev
- Each party has isolated state (video, play status, users)
- Empty parties are automatically cleaned up
- WebSocket connection runs on the same port as Next.js (9002)

## 🔧 Troubleshooting

If sync isn't working:
1. Make sure the server is running (`npm run dev`)
2. Check browser console for Socket.IO connection
3. Ensure all users are in the same party ID
4. Try refreshing if connection drops

Enjoy your synchronized video parties! 🎉
