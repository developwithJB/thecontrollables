import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InstagramMediaItem {
  id: string;
  caption: string | null;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  thumbnail_url: string;
  timestamp: string;
  permalink: string;
}

interface IGMediaResponse {
  media: InstagramMediaItem[];
  username?: string;
  error?: string;
}

export function useInstagramMedia(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instagram-media"],
    queryFn: async (): Promise<IGMediaResponse> => {
      const { data, error } = await supabase.functions.invoke("ig-stories-fetch");
      if (error) throw error;
      return data as IGMediaResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["instagram-media"] });
  };

  return {
    media: query.data?.media || [],
    username: query.data?.username || null,
    isLoading: query.isLoading,
    error: query.data?.error || null,
    refresh,
  };
}
