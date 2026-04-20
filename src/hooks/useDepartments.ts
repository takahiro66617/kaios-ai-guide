import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export function useDepartments(includeInactive = false) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("departments").select("*").order("sort_order").order("name");
    if (!includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (!error && data) {
      setDepartments(
        data.map((r: any) => ({
          id: r.id,
          name: r.name,
          sortOrder: r.sort_order,
          isActive: r.is_active,
        }))
      );
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => { refresh(); }, [refresh]);

  return { departments, loading, refresh };
}
