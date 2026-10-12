"use client";

import React from "react";

/**
 * Shared dashboard theme context.
 * Lives outside `dashboard/layout.tsx` because Next's route typegen
 * rejects extra named exports from layout files.
 */
export const ThemeContext = React.createContext({
  isDark: false,
  role: "Employee",
  toggleTheme: () => {},
});

export const useTheme = () => React.useContext(ThemeContext);