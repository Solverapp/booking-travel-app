import { createContext } from "react";

export const STORAGE_KEY = "bigkey.theme";
export const VALID_PREFERENCES = ["system", "light", "dark"];
export const ThemeContext = createContext(null);
