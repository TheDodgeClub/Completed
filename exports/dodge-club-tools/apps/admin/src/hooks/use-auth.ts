import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLocation } from "wouter";
import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  isAdmin: z.boolean(),
  memberSince: z.string(),
  eventsAttended: z.number(),
  medalsEarned: z.number(),
  ringsEarned: z.number(),
  avatarUrl: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export function useAuth() {
  const [, setLocation] = useLocation();

  return useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const token = localStorage.getItem("dc_admin_token");
      if (!token) return null;
      try {
        const user = await fetchApi<User>("/api/auth/me");
        if (!user.isAdmin) {
          throw new Error("Admin access required.");
        }
        return user;
      } catch (err) {
        localStorage.removeItem("dc_admin_token");
        localStorage.removeItem("dc_admin_user");
        setLocation("/login");
        throw err;
      }
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetchApi<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      
      if (!res.user.isAdmin) {
        throw new Error("Admin access required. This dashboard is restricted to administrators.");
      }
      
      localStorage.setItem("dc_admin_token", res.token);
      localStorage.setItem("dc_admin_user", JSON.stringify(res.user));
      return res.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-me"], user);
      setLocation("/");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      await fetchApi("/api/auth/logout", { method: "POST" }).catch(() => {});
      localStorage.removeItem("dc_admin_token");
      localStorage.removeItem("dc_admin_user");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });
}
