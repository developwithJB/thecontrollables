import { useCallback, useEffect, useState } from "react";
import { isControllableGuideId, type ControllableGuideId } from "@/lib/controllables";

export interface CoachMessage { role: "user" | "assistant"; content: string }
interface Conversation {
  owner: string;
  remember: boolean;
  guide: ControllableGuideId | null;
  messages: CoachMessage[];
}
const empty = (owner: string): Conversation => ({ owner, remember: false, guide: null, messages: [] });
const keyFor = (owner: string) => `coach-conversation:${owner}`;
const MAX_AGE = 24 * 60 * 60 * 1000;

export function readCoachConversation(owner: string, storage?: Storage, now = Date.now()): Conversation {
  if (!owner) return empty(owner);
  try {
    const store = storage ?? window.sessionStorage;
    const value = JSON.parse(store.getItem(keyFor(owner)) ?? "null");
    if (value?.version !== 1 || value.owner !== owner || !Number.isFinite(value.savedAt) ||
      now - value.savedAt >= MAX_AGE || value.savedAt > now || !Array.isArray(value.messages) ||
      value.messages.length > 50 || (value.guide !== null && !isControllableGuideId(value.guide)) ||
      value.messages.some((m: CoachMessage) => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 12000)) {
      store.removeItem(keyFor(owner));
      return empty(owner);
    }
    return { owner, remember: true, guide: value.guide, messages: value.messages };
  } catch { return empty(owner); }
}

/** Opt-in tab cache, never an entitlement, consent grant, or server memory. */
export function useCoachConversation(userId?: string) {
  const owner = userId ?? "";
  const [state, setState] = useState(() => readCoachConversation(owner));
  const [storageFailed, setStorageFailed] = useState(false);
  const current = state.owner === owner ? state : empty(owner);
  useEffect(() => { setState(readCoachConversation(owner)); setStorageFailed(false); }, [owner]);
  useEffect(() => {
    if (!owner || state.owner !== owner) return;
    try {
      if (state.remember) {
        sessionStorage.setItem(keyFor(owner), JSON.stringify({
          version: 1, owner, guide: state.guide, messages: state.messages.slice(-50), savedAt: Date.now(),
        }));
      } else sessionStorage.removeItem(keyFor(owner));
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  }, [owner, state]);
  const setMessages = useCallback((update: CoachMessage[] | ((previous: CoachMessage[]) => CoachMessage[])) => setState(previous => previous.owner === owner
    ? { ...previous, messages: typeof update === "function" ? update(previous.messages) : update } : previous), [owner]);
  const setGuide = useCallback((guide: ControllableGuideId | null) => setState(previous => previous.owner === owner ? { ...previous, guide } : previous), [owner]);
  const setRemember = useCallback((remember: boolean) => setState(previous => previous.owner === owner ? { ...previous, remember } : previous), [owner]);
  return {
    messages: current.messages,
    guide: current.guide,
    remember: current.remember,
    storageFailed,
    setMessages,
    setGuide,
    setRemember,
  };
}
