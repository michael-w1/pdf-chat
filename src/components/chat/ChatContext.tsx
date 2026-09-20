import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { SOURCE_PAGES_HEADER, parseSourcePages } from "@/config/chat";
import { useMutation } from "@tanstack/react-query";
import { createContext, ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

type StreamResponse = {
    addMessage: () => void;
    message: string;
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
    addMessage: () => {},
    message: "",
    handleInputChange: () => {},
    isLoading: false,
});

type Props = {
    fileId: string;
    children: ReactNode;
};

const AI_RESPONSE_ID = "ai-response";

class SendMessageError extends Error {
    constructor(public readonly status: number) {
        super(`Failed to send message (${status})`);
    }
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const backupMessage = useRef("");

    const utils = trpc.useUtils();
    const queryKey = { fileId, limit: INFINITE_QUERY_LIMIT };

    // Plain fetch rather than tRPC because the response is a stream.
    const { mutate: sendMessage } = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            const res = await fetch("/api/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId, message }),
            });
            if (!res.ok) throw new SendMessageError(res.status);

            // Citations arrive in a header ahead of the streamed answer.
            const sourcePages = parseSourcePages(res.headers.get(SOURCE_PAGES_HEADER));

            return { stream: res.body, sourcePages };
        },

        onMutate: async ({ message }) => {
            backupMessage.current = message;
            setMessage("");

            await utils.getFileMessages.cancel();

            // Snapshot the full infinite-query data so onError can restore it.
            const prevData = utils.getFileMessages.getInfiniteData(queryKey);

            utils.getFileMessages.setInfiniteData(queryKey, (old) => {
                if (!old) return { pages: [], pageParams: [] };

                const optimisticMessage = {
                    createdAt: new Date().toISOString(),
                    id: crypto.randomUUID(),
                    text: message,
                    isUserMessage: true,
                    sourcePages: [] as number[],
                };

                const [latestPage, ...rest] = old.pages;
                if (!latestPage) {
                    return {
                        ...old,
                        pages: [{ messages: [optimisticMessage], nextCursor: undefined }],
                        pageParams: [null],
                    };
                }

                // Build new objects rather than mutating the cached page.
                return {
                    ...old,
                    pages: [
                        { ...latestPage, messages: [optimisticMessage, ...latestPage.messages] },
                        ...rest,
                    ],
                };
            });

            setIsLoading(true);
            return { prevData };
        },

        onSuccess: async ({ stream, sourcePages }) => {
            setIsLoading(false);

            if (!stream) {
                return toast.error("There was a problem sending this message", {
                    description: "Please refresh this page and try again",
                });
            }

            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let accResponse = "";

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                accResponse += decoder.decode(value, { stream: !done });

                utils.getFileMessages.setInfiniteData(queryKey, (old) => {
                    if (!old) return { pages: [], pageParams: [] };

                    const isAiResponseCreated = old.pages.some((page) =>
                        page.messages.some((m) => m.id === AI_RESPONSE_ID)
                    );

                    const updatedPages = old.pages.map((page, i) => {
                        if (i !== 0) return page;

                        const updatedMessages = isAiResponseCreated
                            ? page.messages.map((m) =>
                                  m.id === AI_RESPONSE_ID ? { ...m, text: accResponse } : m
                              )
                            : [
                                  {
                                      createdAt: new Date().toISOString(),
                                      id: AI_RESPONSE_ID,
                                      text: accResponse,
                                      isUserMessage: false,
                                      sourcePages,
                                  },
                                  ...page.messages,
                              ];

                        return { ...page, messages: updatedMessages };
                    });

                    return { ...old, pages: updatedPages };
                });
            }
        },

        onError: (error, _, context) => {
            setMessage(backupMessage.current);
            // Restore the exact cache entry that onMutate modified.
            utils.getFileMessages.setInfiniteData(queryKey, context?.prevData);

            if (error instanceof SendMessageError && error.status === 429) {
                toast.error("You're sending messages too quickly", {
                    description: "Please wait a few minutes and try again",
                });
                return;
            }
            toast.error("Failed to send message", {
                description: "Please try again",
            });
        },

        onSettled: async () => {
            setIsLoading(false);
            await utils.getFileMessages.invalidate({ fileId });
        },
    });

    const addMessage = () => {
        const trimmed = message.trim();
        if (!trimmed || isLoading) return;
        sendMessage({ message: trimmed });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
    };

    return (
        <ChatContext.Provider value={{ addMessage, message, handleInputChange, isLoading }}>
            {children}
        </ChatContext.Provider>
    );
};
