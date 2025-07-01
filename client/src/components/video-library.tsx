import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Grid3X3, List } from "lucide-react";
import type { Video } from "@shared/schema";

interface VideoLibraryProps {
  videos: Video[];
  onVideoPlay: (video: Video) => void;
}

export default function VideoLibrary({ videos, onVideoPlay }: VideoLibraryProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredVideos = videos.filter(video => 
    selectedLevel === "all" || video.level === selectedLevel || video.level === "All Levels"
  );

  const levels = ["all", "Beginner", "Intermediate", "Advanced", "All Levels"];

  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Prerecorded Classes</CardTitle>
            <p className="text-gray-600 mt-1">Access your library of recorded lessons</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="All Levels">All Levels</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="p-2"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="p-2"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="video-card group"
              onClick={() => onVideoPlay(video)}
            >
              <div className="relative overflow-hidden rounded-lg bg-black aspect-video mb-4">
                <img
                  src={video.thumbnailUrl || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop"}
                  alt={`${video.title} thumbnail`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="video-overlay group-hover:bg-black/20">
                  <div className="play-button">
                    <Play className="text-gray-800 ml-1 h-5 w-5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{video.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{video.instructor}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  video.level === "Beginner" ? "bg-green-100 text-green-800" :
                  video.level === "Intermediate" ? "bg-yellow-100 text-yellow-800" :
                  video.level === "Advanced" ? "bg-red-100 text-red-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {video.level}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No videos found for the selected level.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Button variant="outline">
            Load More Videos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
