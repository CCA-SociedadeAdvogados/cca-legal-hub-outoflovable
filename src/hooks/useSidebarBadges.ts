import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { addDays } from "date-fns";

export function useSidebarBadges() {
  const { user } = useAuth();
  const { unreadCount: notificationsCount } = useNotifications();

  // Contracts expiring in next 30 days
  const { data: expiringContractsCount = 0 } = useQuery({
    queryKey: ["expiring-contracts-badge"],
    queryFn: async () => {
      const today = new Date();
      const in30Days = addDays(today, 30);
      
      const { count, error } = await supabase
        .from("contratos_safe" as "contratos")
        .select("*", { count: "exact", head: true })
        .gte("data_termo", today.toISOString().split("T")[0])
        .lte("data_termo", in30Days.toISOString().split("T")[0])
        .not("estado_contrato", "in", "(expirado,denunciado,rescindido)")
        .eq("arquivado", false);
      
      if (error) {
        console.error("Error fetching expiring contracts:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Unread CCA news count
  const { data: unreadNewsCount = 0 } = useQuery({
    queryKey: ["unread-news-badge"],
    queryFn: async () => {
      // Count news notifications that are unread
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "news_published")
        .eq("read", false);
      
      if (error) {
        console.error("Error fetching unread news:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    contracts: expiringContractsCount,
    notifications: notificationsCount,
    news: unreadNewsCount,
  };
}
