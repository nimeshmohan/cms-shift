import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "@/contexts/AuthContext";

// Helper: build auth headers only when logged in
async function authHeaders(currentUser: any): Promise<Record<string, string>> {
  if (!currentUser) return {};
  const firebaseToken = await currentUser.getIdToken();
  return {
    'Authorization': `Bearer ${firebaseToken}`,
    'X-User-Id': currentUser.uid,
  };
}

export function useWebflowCollections() {
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async (token: string) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(await authHeaders(currentUser)),
      };

      const res = await fetch(api.webflow.getCollections.path, {
        method: api.webflow.getCollections.method,
        headers,
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to fetch Webflow collections. Check your token.");
      }

      return api.webflow.getCollections.responses[200].parse(await res.json());
    },
  });
}

export function useWebflowFields() {
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({ token, collectionId }: { token: string; collectionId: string }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(await authHeaders(currentUser)),
      };

      const url = buildUrl(api.webflow.getFields.path, { id: collectionId });
      const res = await fetch(url, {
        method: api.webflow.getFields.method,
        headers,
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to fetch fields for this collection.");
      }

      return api.webflow.getFields.responses[200].parse(await res.json());
    },
  });
}

// Fetch all existing items from a referenced collection so the user
// can pick them from a dropdown instead of typing names or IDs manually.
export function useWebflowCollectionItems() {
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({ token, collectionId }: { token: string; collectionId: string }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(await authHeaders(currentUser)),
      };

      const res = await fetch(`/api/webflow/collections/${collectionId}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to fetch collection items.");
      }

      const data = await res.json();
      return data as Array<{ id: string; name: string; slug: string }>;
    },
  });
}
