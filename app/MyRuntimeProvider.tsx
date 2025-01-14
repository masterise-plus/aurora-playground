"use client";

import React from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";

const MyModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const lastMessage = messages[messages.length - 1];
    const input_value = lastMessage.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("\n");

    const result = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input_value,
        session_id: "A0005",
        output_type: "chat",
        input_type: "chat"
      }),
      signal: abortSignal
    });

    const data = await result.json();
    const text = data.text || '';
    
    yield {
      content: [{
        type: "text",
        text
      }]
    };
  }
};

import { createContext, useContext } from "react";
const RuntimeContext = createContext<ReturnType<typeof useLocalRuntime> | undefined>(undefined);

export function useMyRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error("useMyRuntime must be used within a MyRuntimeProvider");
  }
  return runtime;
}

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const runtime = useLocalRuntime(MyModelAdapter);

  React.useEffect(() => {
    // Remove Dashlane attributes after hydration
    const removeDashlaneAttributes = () => {
      const elements = document.querySelectorAll('[data-dashlane-rid], [data-dashlane-label]');
      elements.forEach(el => {
        el.removeAttribute('data-dashlane-rid');
        el.removeAttribute('data-dashlane-label');
      });
    };

    // Suppress hydration warnings for Dashlane attributes
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (/Warning: Prop `(data-dashlane-rid|data-dashlane-label)` did not match/.test(args[0])) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    removeDashlaneAttributes();

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <RuntimeContext.Provider value={runtime}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </RuntimeContext.Provider>
  );
}
