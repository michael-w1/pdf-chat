"use client";

import { useEffect, useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import ChatWrapper from "@/components/chat/ChatWrapper";
import PdfRendererClient from "@/components/PdfRenderClient";
import { PdfPageProvider, usePdfPage } from "@/components/PdfPageContext";
import { cn } from "@/lib/utils";

type Props = {
    fileId: string;
    url: string;
};

type Pane = "document" | "chat";

const WorkspaceInner = ({ fileId, url }: Props) => {
    // Only meaningful below the lg breakpoint, where the two panes share the
    // screen. Above it both are visible and this is ignored.
    const [pane, setPane] = useState<Pane>("chat");
    const { subscribe } = usePdfPage();

    // Clicking a citation should reveal the page it points at, which on a
    // small screen means switching away from the chat.
    useEffect(() => subscribe(() => setPane("document")), [subscribe]);

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2 lg:hidden">
                {(
                    [
                        ["document", "Document", FileText],
                        ["chat", "Chat", MessageSquare],
                    ] as const
                ).map(([value, label, Icon]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setPane(value)}
                        aria-pressed={pane === value}
                        className={cn(
                            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            pane === value
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="size-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Both panes stay mounted so switching does not reload the PDF or
                discard in-flight chat state. */}
            <div className="flex min-h-0 flex-1 lg:gap-4 lg:p-4">
                <div
                    className={cn(
                        "min-h-0 flex-1 p-3 lg:block lg:p-0",
                        pane === "document" ? "block" : "hidden"
                    )}
                >
                    <PdfRendererClient url={url} />
                </div>

                <div
                    className={cn(
                        "min-h-0 flex-1 lg:block lg:max-w-md lg:flex-none lg:overflow-hidden lg:rounded-lg lg:border lg:border-border xl:max-w-lg",
                        pane === "chat" ? "block" : "hidden"
                    )}
                >
                    <ChatWrapper fileId={fileId} />
                </div>
            </div>
        </div>
    );
};

const DocumentWorkspace = (props: Props) => (
    <PdfPageProvider>
        <WorkspaceInner {...props} />
    </PdfPageProvider>
);

export default DocumentWorkspace;
