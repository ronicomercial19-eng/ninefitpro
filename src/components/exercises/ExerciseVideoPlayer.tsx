 import { useState, useEffect } from 'react';
 import { Play, Loader2, Video, ImageOff } from 'lucide-react';
 import { getExerciseVideo } from '@/services/exerciseVideoService';
 
 interface ExerciseVideoPlayerProps {
   exerciseId: string;
   exerciseName: string;
   className?: string;
   showGif?: boolean;
   autoPlay?: boolean;
 }
 
 export function ExerciseVideoPlayer({
   exerciseId,
   exerciseName,
   className = '',
   showGif = true,
   autoPlay = false
 }: ExerciseVideoPlayerProps) {
   const [loading, setLoading] = useState(true);
   const [videoUrl, setVideoUrl] = useState<string | null>(null);
   const [gifUrl, setGifUrl] = useState<string | null>(null);
   const [error, setError] = useState(false);
   const [playing, setPlaying] = useState(autoPlay);
 
   useEffect(() => {
     const fetchVideo = async () => {
       setLoading(true);
       setError(false);
       
       try {
         const data = await getExerciseVideo(exerciseId);
         
         if (data) {
           setVideoUrl(data.video_url || null);
           setGifUrl(data.gif_url || null);
         } else {
           setError(true);
         }
       } catch (err) {
         console.error('Error loading video:', err);
         setError(true);
       } finally {
         setLoading(false);
       }
     };
 
     if (exerciseId) {
       fetchVideo();
     }
   }, [exerciseId]);
 
   if (loading) {
     return (
       <div className={`flex items-center justify-center bg-muted rounded-sm ${className}`}>
         <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (error || (!videoUrl && !gifUrl)) {
     return (
       <div className={`flex flex-col items-center justify-center bg-muted rounded-sm ${className}`}>
         <ImageOff className="w-8 h-8 text-muted-foreground mb-2" />
         <span className="text-xs text-muted-foreground">Sem mídia</span>
       </div>
     );
   }
 
   // Show GIF preview
   if (showGif && gifUrl && !playing) {
     return (
       <div className={`relative group cursor-pointer ${className}`}>
         <img
           src={gifUrl}
           alt={exerciseName}
           className="w-full h-full object-cover rounded-sm"
         />
         {videoUrl && (
           <button
             onClick={() => setPlaying(true)}
             className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
           >
             <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
               <Play className="w-6 h-6 text-primary-foreground ml-1" />
             </div>
           </button>
         )}
       </div>
     );
   }
 
   // Show video player
   if (videoUrl && (playing || !gifUrl)) {
     return (
       <div className={`relative ${className}`}>
         <video
           src={videoUrl}
           controls
           autoPlay={autoPlay}
           loop
           muted
           className="w-full h-full object-cover rounded-sm"
         >
           Seu navegador não suporta vídeos.
         </video>
         {gifUrl && (
           <button
             onClick={() => setPlaying(false)}
             className="absolute top-2 right-2 p-2 bg-black/50 rounded-sm hover:bg-black/70 transition-colors"
           >
             <Video className="w-4 h-4 text-white" />
           </button>
         )}
       </div>
     );
   }
 
   // Fallback - show GIF only
   if (gifUrl) {
     return (
       <div className={className}>
         <img
           src={gifUrl}
           alt={exerciseName}
           className="w-full h-full object-cover rounded-sm"
         />
       </div>
     );
   }
 
   return null;
 }