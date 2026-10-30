import { useCallback, useMemo, useState } from "react";
import { AuthPromptContext } from "./authPrompt";

export const AuthPromptProvider = ({ children }) => {
  const [prompt, setPrompt] = useState(null);

  const openAuthPrompt = useCallback((options = {}) => {
    setPrompt({
      service: options.service || "booking",
      from: options.from || null,
    });
  }, []);

  const closeAuthPrompt = useCallback(() => setPrompt(null), []);

  const value = useMemo(
    () => ({ prompt, openAuthPrompt, closeAuthPrompt }),
    [prompt, openAuthPrompt, closeAuthPrompt],
  );

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
    </AuthPromptContext.Provider>
  );
};
