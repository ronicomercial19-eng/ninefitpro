 import { supabase } from "@/integrations/supabase/client";
 
 interface ExerciseVideo {
   id: string;
   name: string;
   video_url?: string;
   gif_url?: string;
   external_video_id?: string;
 }
 
 interface ExternalVideoResponse {
   id: string;
   url: string;
   gif_url?: string;
   thumbnail?: string;
 }
 
 // Placeholder for external API configuration
 const EXTERNAL_API_URL = ''; // Will be set when API is integrated
 const EXTERNAL_API_KEY = ''; // Will be stored in secrets
 
 /**
  * Fetches exercise video from cache (Supabase) or external API
  * Strategy: Cache-first, then external API, then save to cache
  */
 export async function getExerciseVideo(exerciseId: string): Promise<ExerciseVideo | null> {
   try {
     // Step 1: Check cache (Supabase)
     const { data: cachedExercise, error } = await supabase
       .from('exercises')
       .select('id, name, video_url, gif_url, external_video_id, video_cached_at')
       .eq('id', exerciseId)
       .single();
 
     if (error) {
       console.error('Error fetching exercise from cache:', error);
       return null;
     }
 
     // If we have cached video data, return it
     if (cachedExercise?.video_url || cachedExercise?.gif_url) {
       return cachedExercise;
     }
 
     // Step 2: If no cached video and API is configured, fetch from external API
     if (EXTERNAL_API_URL && EXTERNAL_API_KEY && cachedExercise?.external_video_id) {
       const externalVideo = await fetchFromExternalAPI(cachedExercise.external_video_id);
       
       if (externalVideo) {
         // Step 3: Save to cache for future use
         await cacheExerciseVideo(exerciseId, externalVideo);
         
         return {
           ...cachedExercise,
           video_url: externalVideo.url,
           gif_url: externalVideo.gif_url
         };
       }
     }
 
     return cachedExercise;
   } catch (error) {
     console.error('Error in getExerciseVideo:', error);
     return null;
   }
 }
 
 /**
  * Fetches video from external API (placeholder implementation)
  * This will be implemented when the external API is integrated
  */
 async function fetchFromExternalAPI(externalVideoId: string): Promise<ExternalVideoResponse | null> {
   if (!EXTERNAL_API_URL || !EXTERNAL_API_KEY) {
     console.log('External video API not configured');
     return null;
   }
 
   try {
     const response = await fetch(`${EXTERNAL_API_URL}/videos/${externalVideoId}`, {
       headers: {
         'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
         'Content-Type': 'application/json'
       }
     });
 
     if (!response.ok) {
       throw new Error(`External API error: ${response.status}`);
     }
 
     return await response.json();
   } catch (error) {
     console.error('Error fetching from external API:', error);
     return null;
   }
 }
 
 /**
  * Saves video URL to Supabase cache
  */
 async function cacheExerciseVideo(exerciseId: string, video: ExternalVideoResponse): Promise<void> {
   try {
     const { error } = await supabase
       .from('exercises')
       .update({
         video_url: video.url,
         gif_url: video.gif_url || null,
         video_cached_at: new Date().toISOString()
       })
       .eq('id', exerciseId);
 
     if (error) {
       console.error('Error caching exercise video:', error);
     }
   } catch (error) {
     console.error('Error in cacheExerciseVideo:', error);
   }
 }
 
 /**
  * Batch fetch videos for multiple exercises
  */
 export async function getExerciseVideos(exerciseIds: string[]): Promise<Map<string, ExerciseVideo>> {
   const result = new Map<string, ExerciseVideo>();
 
   if (exerciseIds.length === 0) return result;
 
   try {
     const { data: exercises, error } = await supabase
       .from('exercises')
       .select('id, name, video_url, gif_url, external_video_id')
       .in('id', exerciseIds);
 
     if (error) {
       console.error('Error fetching exercises:', error);
       return result;
     }
 
     for (const exercise of exercises || []) {
       result.set(exercise.id, exercise);
     }
 
     return result;
   } catch (error) {
     console.error('Error in getExerciseVideos:', error);
     return result;
   }
 }
 
 /**
  * Search exercises by name with video data
  */
 export async function searchExercisesWithVideo(query: string, limit: number = 20): Promise<ExerciseVideo[]> {
   try {
     const { data, error } = await supabase
       .from('exercises')
       .select('id, name, video_url, gif_url, external_video_id')
       .ilike('name', `%${query}%`)
       .limit(limit);
 
     if (error) {
       console.error('Error searching exercises:', error);
       return [];
     }
 
     return data || [];
   } catch (error) {
     console.error('Error in searchExercisesWithVideo:', error);
     return [];
   }
 }
 
 /**
  * Manually set video URL for an exercise (for admin use)
  */
 export async function setExerciseVideoUrl(exerciseId: string, videoUrl: string, gifUrl?: string): Promise<boolean> {
   try {
     const { error } = await supabase
       .from('exercises')
       .update({
         video_url: videoUrl,
         gif_url: gifUrl || null,
         video_cached_at: new Date().toISOString()
       })
       .eq('id', exerciseId);
 
     if (error) {
       console.error('Error setting exercise video URL:', error);
       return false;
     }
 
     return true;
   } catch (error) {
     console.error('Error in setExerciseVideoUrl:', error);
     return false;
   }
 }