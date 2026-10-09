import { useEffect, useState } from "react";
import { fetchHealth } from "../services/api";

export type ServerState = "checking" | "online" | "offline";

export function useServerHealth(): ServerState {
  const [state, setState] = useState<ServerState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((data) => setState(data.status === "ok" ? "online" : "offline"))
      .catch((err) => {
        if (err?.name !== "AbortError") setState("offline");
      });
    return () => controller.abort();
  }, []);

  return state;
}
