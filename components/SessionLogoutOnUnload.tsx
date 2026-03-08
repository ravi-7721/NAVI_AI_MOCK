"use client";

import { useEffect } from "react";

const SessionLogoutOnUnload = () => {
  useEffect(() => {
    const clearSession = () => {
      // keepalive lets the browser send this request during tab/window close.
      fetch("/api/auth/session", {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {
        // no-op: browser may cancel requests during teardown
      });
    };

    window.addEventListener("pagehide", clearSession);

    return () => {
      window.removeEventListener("pagehide", clearSession);
    };
  }, []);

  return null;
};

export default SessionLogoutOnUnload;
