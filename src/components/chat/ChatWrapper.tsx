"use client";

import { trpc } from "@/app/_trpc/client";
import ChatInput from "./ChatInput";
import Messages from "./Messages";
import { ChevronLeft, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { ChatContextProvider } from "./ChatContext";
import { Button } from "../ui/button";
import { ReactNode } from "react";

type Props = {
    fileId: string;
};

/** Shared frame for the pre-chat states, so they cannot drift apart. */
const ChatState = ({
    icon,
    title,
    body,
    action,
}: {
    icon: ReactNode;
    title: string;
    body?: string;
    action?: ReactNode;
}) => (
    <div className="relative flex h-full flex-col justify-between bg-background">
        <div className="mb-28 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            {icon}
            <h3 className="font-medium">{title}</h3>
            {body ? (
                <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
            ) : null}
            {action}
        </div>
        <ChatInput isDisabled />
    </div>
);

const ChatWrapper = ({ fileId }: Props) => {
    const { data, isLoading } = trpc.getFileUploadStatus.useQuery(
        { fileId },
        {
            refetchInterval: (query) => {
                const status = query.state.data?.status;
                return status === "SUCCESS" || status === "FAILED" ? false : 500;
            },
        }
    );

    if (isLoading) {
        return (
            <ChatState
                icon={<Loader2 className="size-7 animate-spin text-muted-foreground" />}
                title="Loading"
                body="Preparing your document."
            />
        );
    }

    if (data?.status === "PROCESSING") {
        return (
            <ChatState
                icon={<Loader2 className="size-7 animate-spin text-brand" />}
                title="Analysing document"
                body="Extracting text and building the search index. This usually takes a few seconds."
            />
        );
    }

    if (data?.status === "FAILED") {
        return (
            <ChatState
                icon={<XCircle className="size-7 text-destructive" />}
                title="We couldn't process this PDF"
                body="Make sure it contains selectable text and is under 4 MB, then try uploading it again."
                action={
                    <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link href="/dashboard">
                            <ChevronLeft className="size-3.5" />
                            Back to documents
                        </Link>
                    </Button>
                }
            />
        );
    }

    return (
        <ChatContextProvider fileId={fileId}>
            <div className="relative flex h-full flex-col justify-between bg-background">
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Messages fileId={fileId} />
                </div>
                <ChatInput />
            </div>
        </ChatContextProvider>
    );
};

export default ChatWrapper;
