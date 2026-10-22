# SyncTube - Watch YouTube Together in Sync

Watch YouTube with friends in real time: one person hosts a party, others join with its ID, and playback stays in sync over Socket.IO.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Live demo](https://img.shields.io/badge/Live%20demo-synctube--tau.vercel.app-000000?style=flat-square&logo=vercel&logoColor=white)](https://synctube-tau.vercel.app)

<img src="docs/screenshot.png" alt="SyncTube create-party screen" width="100%">

A real-time synchronized YouTube player that lets you watch videos with friends, perfectly in sync.

## 🚀 Quick Start

1. **Install dependencies:**
   ```cmd
   npm install
   ```

2. **Run the development server:**
   ```cmd
   npm run dev
   ```

3. **Open in browser:**
   - Go to `http://localhost:9002`
   - Create a party or join with a party ID
   - Share the party ID with friends
   - Load a YouTube video and click "Play Together"

## ✨ Features

- **Real-time sync** - Everyone plays at the exact same time
- **Host controls** - First person creates the party and becomes host
- **Sync to position** - Bring everyone to your current timestamp
- **YouTube URL support** - Paste full URLs or video IDs
- **Party system** - Unique party IDs for private sessions
- **User presence** - See who's in the party

## 🛠️ Tech Stack

- Next.js 15
- Socket.IO (real-time communication)
- YouTube IFrame API
- TailwindCSS + shadcn/ui

## 📝 How It Works

1. One person creates a party and gets a unique party ID
2. Others join using that party ID
3. Anyone can load videos and control playback
4. All actions sync across everyone in the party in real-time

Enjoy watching together! 🎉
