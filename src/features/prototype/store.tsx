import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { currentPerson, initialState, transition, type Action, type State } from "./model";
import { parseState, readState, saveState, type StoragePort } from "./storage";
import { identifyPerson, posthogConfigured, resetIdentity } from "@/lib/posthog";

function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function useStore() {
  const [loaded] = useState(() => readState(browserStorage()));
  const [state, setState] = useState(loaded.state);
  const [issue, setIssue] = useState(loaded.issue);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(loaded.blocked);
  const latest = useRef(state);
  const identifiedPersonId = useRef<string | null>(null);
  const activePerson = currentPerson(state);

  function resetPosthogIdentity() {
    resetIdentity();
    identifiedPersonId.current = null;
  }

  function commit(next: State, replace = false) {
    latest.current = next;
    setState(next);
    setError("");
    if (blocked && !replace) return;
    try {
      saveState(browserStorage(), next);
      setIssue("");
      if (replace) setBlocked(false);
    } catch (e) {
      setIssue((e as Error).message);
    }
  }
  function run(action: Action) {
    try {
      const next = transition(latest.current, action);
      if (
        action.type === "select_person" &&
        latest.current.activePersonId !== next.activePersonId &&
        latest.current.activePersonId !== null
      )
        resetPosthogIdentity();
      commit(next);
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Sprawdź poprawność i długość wprowadzonych danych.",
      );
      return false;
    }
  }
  function importState(raw: string) {
    try {
      const next = parseState(raw);
      if (latest.current.activePersonId !== next.activePersonId) resetPosthogIdentity();
      commit(next, true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!posthogConfigured || !activePerson || identifiedPersonId.current === activePerson.id)
      return;
    identifyPerson(activePerson.id, activePerson.role);
    identifiedPersonId.current = activePerson.id;
  }, [activePerson]);
  return {
    state,
    issue,
    error,
    blocked,
    original: loaded.original,
    run,
    importState,
    clearError: () => setError(""),
    reset: () => {
      if (latest.current.activePersonId !== null) resetPosthogIdentity();
      commit(initialState(), true);
    },
  };
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
