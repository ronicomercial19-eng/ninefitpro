 import { useState, useEffect } from 'react';
 import { Play, Loader2, Video, ImageOff } from 'lucide-react';
 import { getExerciseVideo } from '@/services/exerciseVideoService';
 import { youtubeId } from '@/services/libraryPlayback';

 interface ExerciseVideoPlayerProps {
   exerciseId?: string;
   exerciseName: string;
   workoutVideoUrl?: string;
   workoutGifUrl?: string;
   className?: string;
   showGif?: boolean;
   autoPlay?: boolean;
 }
 
 export function ExerciseVideoPlayer({
   exerciseId,
   exerciseName,
   workoutVideoUrl,
   workoutGifUrl,
   className = '',
   showGif = true,
   autoPlay = false
 }: ExerciseVideoPlayerProps) {
   const [loading, setLoading] = useState(true);
   const [videoUrl, setVideoUrl] = useState<string | null>(null);
   const [gifUrl, setGifUrl] = useState<string | null>(null);
   const [playing, setPlaying] = useState(autoPlay);
 
   useEffect(() => {
     let cancelled = false;
     setPlaying(autoPlay);
     setVideoUrl(null);
     setGifUrl(null);
     if (workoutVideoUrl || !exerciseId) {
       setLoading(false);
       return;
     }
     const fetchVideo = async () => {
       setLoading(true);
       
       try {
         const data = await getExerciseVideo(exerciseId);
         
         if (!cancelled && data) {
           setVideoUrl(data.video_url || null);
           setGifUrl(data.gif_url || null);
         }
       } catch (err) {
         console.error('Error loading video:', err);
       } finally {
         if (!cancelled) setLoading(false);
       }
     };
 
     void fetchVideo();
     return () => { cancelled = true; };
   }, [exerciseId, workoutVideoUrl, autoPlay]);
 
   if (loading && !workoutVideoUrl) {
     return (
       <div className={`flex items-center justify-center bg-muted rounded-sm ${className}`}>
         <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   const video = workoutVideoUrl || videoUrl;
   const preview = workoutGifUrl || gifUrl;
   if (!video && !preview) {
     return (
       <div className={`flex flex-col items-center justify-center bg-muted rounded-sm ${className}`}>
         <ImageOff className="w-8 h-8 text-muted-foreground mb-2" />
         <span className="text-xs text-muted-foreground">Sem mídia</span>
       </div>
     );
   }
 
   // Show GIF preview
   if (showGif && preview && !playing) {
     return (
       <div className={`relative group cursor-pointer ${className}`}>
         <img
           src={preview}
           alt={exerciseName}
           className="w-full h-full object-cover rounded-sm"
         />
         {video && (
           <button
             onClick={() => setPlaying(true)}
             aria-label={`Reproduzir vídeo de ${exerciseName}`}
             className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/40 transition-colors"
           >
             <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
               <Play className="w-6 h-6 text-primary-foreground ml-1" />
             </div>
           </button>
         )}
       </div>
     );
   }
 
   const id = video ? youtubeId(video) : null;

   // YouTube não é reproduzível pela tag <video>; usa embed controlado.
   if (id && (playing || !showGif || !preview)) {
     const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
     return (
       <div className={`relative ${className}`}>
         <iframe
           src={playing ? `${youtubeEmbedUrl}?autoplay=1` : youtubeEmbedUrl}
           title={exerciseName}
           referrerPolicy="strict-origin-when-cross-origin"
           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
           allowFullScreen
           className="w-full h-full min-h-48 rounded-sm border-0"
         />
         <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"
           className="absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
           Abrir no YouTube
         </a>
         {showGif && preview && (
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

   // Show video player
   if (video && (playing || !showGif || !preview)) {
     return (
       <div className={`relative ${className}`}>
         <video
           src={video}
           controls
           autoPlay={playing}
           playsInline
           loop
           muted
           className="w-full h-full object-cover rounded-sm"
         >
           Seu navegador não suporta vídeos.
         </video>
         {showGif && preview && (
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
   if (preview) {
     return (
       <div className={className}>
         <img
           src={preview}
           alt={exerciseName}
           className="w-full h-full object-cover rounded-sm"
         />
       </div>
     );
   }
 
   return null;
 }
