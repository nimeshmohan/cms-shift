import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

export function useTemplates() {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: [api.templates.list.path],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const token = await currentUser.getIdToken();
      const res = await fetch(api.templates.list.path, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': currentUser.uid
        },
        credentials: "include"
      });
      
      if (!res.ok) throw new Error("Failed to fetch templates");
      return api.templates.list.responses[200].parse(await res.json());
    },
    enabled: !!currentUser
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.templates.create.input>) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const token = await currentUser.getIdToken();
      const res = await fetch(api.templates.create.path, {
        method: api.templates.create.method,
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
          'X-User-Id': currentUser.uid
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to create template");
      return api.templates.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.templates.list.path] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const token = await currentUser.getIdToken();
      const url = buildUrl(api.templates.delete.path, { id });
      const res = await fetch(url, {
        method: api.templates.delete.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': currentUser.uid
        },
        credentials: "include",
      });
      
      if (!res.ok && res.status !== 404) throw new Error("Failed to delete template");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.templates.list.path] }),
  });
}
