import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ChatContext } from "./ChatContext";
import { useContext, useEffect } from "react";
import Message from "./Message";
import { useIntersection } from "@mantine/hooks";

type Props = {
    fileId: string;
};

const Messages = ({ fileId }: Props) => {
    const { isLoading: isAiThinking } = useContext(ChatContext);
    const { data, isLoading, fetchNextPage } =
        trpc.getFileMessages.useInfiniteQuery(
            { fileId, limit: INFINITE_QUERY_LIMIT },
            {
                getNextPageParam: (lastPage) => lastPage?.nextCursor,
                placeholderData: keepPreviousData,
            }
        );

    const messages = data?.pages.flatMap((page) => page.messages);

    const loadingMessage = {
        createdAt: new Date().toISOString(),
        id: "loading-message",
        isUserMessage: false,
        sourcePages: [] as number[],
        text: (
            <span className="flex items-center gap-1.5 py-0.5">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
        ),
    };

    const combinedMessages = [
        ...(isAiThinking ? [loadingMessage] : []),
        ...(messages ?? []),
    ];

    const { ref, entry } = useIntersection({ threshold: 1 });

    useEffect(() => {
        if (entry?.isIntersecting) fetchNextPage();
    }, [entry, fetchNextPage]);

    if (combinedMessages.length === 0 && isLoading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className={i % 2 === 0 ? "ml-auto h-12 w-3/5" : "h-16 w-4/5"}
                    />
                ))}
            </div>
        );
    }

    if (combinedMessages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40">
                    <MessageSquare className="size-5 text-brand" />
                </span>
                <h3 className="font-medium">Ready when you are</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                    Ask a question about this document and the answer will cite the
                    pages it came from.
                </p>
            </div>
        );
    }

    return (
        <div className="scrollbar-w-2 flex flex-1 flex-col-reverse gap-4 overflow-y-auto p-4">
            {combinedMessages.map((msg, i) => {
                const isNextMsgSamePerson =
                    combinedMessages[i - 1]?.isUserMessage ===
                    combinedMessages[i]?.isUserMessage;
                const isLast = i === combinedMessages.length - 1;

                return (
                    <Message
                        key={msg.id}
                        ref={isLast ? ref : undefined}
                        message={msg}
                        isNextMessageSamePerson={isNextMsgSamePerson}
                    />
                );
            })}

            {isLoading ? (
                <div className="flex justify-center py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
            ) : null}
        </div>
    );
};

export default Messages;
