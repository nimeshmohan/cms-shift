import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

export function useJobs() {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const token = await currentUser.getIdToken();
      const res = await fetch(api.jobs.list.path, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': currentUser.uid
        },
        credentials: "include"
      });
      
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return api.jobs.list.responses[200].parse(await res.json());
    },
    enabled: !!currentUser
  });
}

export function useJob(id: string) {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const token = await currentUser.getIdToken();
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': currentUser.uid
        },
        credentials: "include"
      });
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      return api.jobs.get.responses[200].parse(await res.json());
    },
    enabled: !!currentUser && !!id,
    // Poll every 2 seconds if the job is still running
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "pending" || data.status === "processing")) {
        return 2000;
      }
      return false;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.jobs.create.input>) => {
      // Build headers — include auth only when logged in
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-User-Id'] = currentUser.uid;
      }

      const res = await fetch(api.jobs.create.path, {
        method: api.jobs.create.method,
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Surface the requiresAuth flag back to the caller
        if (body.requiresAuth) {
          const err: any = new Error(body.message || "Login required");
          err.requiresAuth = true;
          err.limit = body.limit;
          err.requested = body.requested;
          throw err;
        }
        throw new Error(body.message || "Failed to start import job");
      }
      
      return api.jobs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
    },
  });
}
