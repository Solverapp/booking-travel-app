import { createContext, useContext } from "react";

export const AuthPromptContext = createContext(null);

export const useAuthPrompt = () => useContext(AuthPromptContext);
