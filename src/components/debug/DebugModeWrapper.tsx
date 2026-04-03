import React from "react";
import { DebugModeProvider } from "./DebugModeProvider";
import DebugFloatingButton from "./DebugFloatingButton";

export const DebugModeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DebugModeProvider>
      {children}
      <DebugFloatingButton />
    </DebugModeProvider>
  );
};
