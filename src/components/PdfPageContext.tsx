"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef } from "react";

type Listener = (page: number) => void;

type PdfPageContextValue = {
    /** Ask the PDF viewer to show the given 1-based page. */
    goToPage: (page: number) => void;
    /** Subscribe to page requests. Returns an unsubscribe function. */
    subscribe: (listener: Listener) => () => void;
};

const PdfPageContext = createContext<PdfPageContextValue>({
    goToPage: () => {},
    subscribe: () => () => {},
});

/**
 * Lets the chat panel ask the PDF viewer to jump to a page. Implemented as a
 * small event bus rather than shared state so the viewer can react in an
 * effect without triggering a render of the whole workspace.
 */
export const PdfPageProvider = ({ children }: { children: ReactNode }) => {
    const listeners = useRef(new Set<Listener>());

    const goToPage = useCallback((page: number) => {
        listeners.current.forEach((listener) => listener(page));
    }, []);

    const subscribe = useCallback((listener: Listener) => {
        listeners.current.add(listener);
        return () => {
            listeners.current.delete(listener);
        };
    }, []);

    const value = useMemo(() => ({ goToPage, subscribe }), [goToPage, subscribe]);

    return <PdfPageContext.Provider value={value}>{children}</PdfPageContext.Provider>;
};

export const usePdfPage = () => useContext(PdfPageContext);
