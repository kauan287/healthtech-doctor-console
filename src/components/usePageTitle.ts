import { useEffect } from "react";

export function usePageTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} · HealthTech`;
  }, [page]);
}
