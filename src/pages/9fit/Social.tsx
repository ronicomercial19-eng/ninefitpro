import { useState } from "react";
import { Heart, MessageCircle, Share2, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const posts = [
  {
    id: "1",
    user: { name: "Alex R.", avatar: "AR" },
    image: "bg-gradient-to-br from-purple-600 to-blue-600",
    caption: "Just crushed my first 5K in under 25 minutes! 🔥",
    likes: 234,
    comments: 12,
    timeAgo: "2h",
  },
  {
    id: "2",
    user: { name: "Maria S.", avatar: "MS" },
    image: "bg-gradient-to-br from-orange-600 to-red-600",
    caption: "Morning yoga session complete. Mind clear, body ready.",
    likes: 189,
    comments: 8,
    timeAgo: "4h",
  },
];

const leaderboard = [
  { rank: 1, name: "Tyler K.", xp: 12450, change: "up" },
  { rank: 2, name: "Emma L.", xp: 11200, change: "up" },
  { rank: 3, name: "James W.", xp: 10890, change: "same" },
  { rank: 4, name: "Sofia M.", xp: 9750, change: "down" },
  { rank: 5, name: "You", xp: 8500, change: "up", isUser: true },
];

export default function NineFitSocial() {
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard">("feed");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Social
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-4 mb-6">
        <button
          onClick={() => setActiveTab("feed")}
          className={`text-sm font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors ${
            activeTab === "feed"
              ? "text-neon-400 border-neon-400"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`text-sm font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors ${
            activeTab === "leaderboard"
              ? "text-neon-400 border-neon-400"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* Content */}
      {activeTab === "feed" ? (
        <div className="space-y-6 px-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-dark-800 border border-dark-700 rounded-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold text-foreground">
                  {post.user.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {post.user.name}
                  </p>
                  <p className="text-[10px] text-gray-500">{post.timeAgo}</p>
                </div>
              </div>

              {/* Image */}
              <div className={`aspect-square ${post.image}`} />

              {/* Actions */}
              <div className="p-3">
                <div className="flex items-center gap-4 mb-2">
                  <button className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-400 hover:text-foreground transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs">{post.comments}</span>
                  </button>
                  <button className="text-gray-400 hover:text-foreground transition-colors ml-auto">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-foreground">{post.caption}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-dark-800 border border-dark-700 rounded-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-bold uppercase text-foreground">
                Global Rankings
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-dark-700">
              {leaderboard.map((user) => (
                <div
                  key={user.rank}
                  className={`flex items-center gap-3 p-4 ${
                    user.isUser ? "bg-neon-400/10" : ""
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`w-8 text-center font-black ${
                      user.rank === 1
                        ? "text-yellow-500"
                        : user.rank === 2
                        ? "text-gray-400"
                        : user.rank === 3
                        ? "text-orange-600"
                        : "text-gray-500"
                    }`}
                  >
                    #{user.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      user.isUser
                        ? "bg-neon-400 text-primary-foreground"
                        : "bg-dark-700 text-foreground"
                    }`}
                  >
                    {user.name.charAt(0)}
                  </div>

                  {/* Name */}
                  <span
                    className={`flex-1 font-bold ${
                      user.isUser ? "text-neon-400" : "text-foreground"
                    }`}
                  >
                    {user.name}
                  </span>

                  {/* XP */}
                  <span className="text-sm text-gray-400">
                    {user.xp.toLocaleString()} XP
                  </span>

                  {/* Change */}
                  {user.change === "up" && (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  )}
                  {user.change === "down" && (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  {user.change === "same" && (
                    <Minus className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
