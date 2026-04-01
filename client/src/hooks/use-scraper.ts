import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "@/contexts/AuthContext";

async function authHeaders(currentUser: any): Promise<Record<string, string>> {
  if (!currentUser) return {};
  const token = await currentUser.getIdToken();
  return { 'Authorization': `Bearer ${token}`, 'X-User-Id': currentUser.uid };
}

export function usePreviewScrape() {
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(api.scraper.preview.path, {
        method: api.scraper.preview.method,
        headers: { "Content-Type": "application/json", ...(await authHeaders(currentUser)) },
        body: JSON.stringify({ url }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to scrape preview URL");
      return api.scraper.preview.responses[200].parse(await res.json());
    },
  });
}

export function useDiscoverUrls() {
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch("/api/scraper/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders(currentUser)) },
        body: JSON.stringify({ domain }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to discover URLs");
      }
      const data = await res.json();
      return data.urls as Array<{ url: string; title?: string }>;
    },
  });
}
