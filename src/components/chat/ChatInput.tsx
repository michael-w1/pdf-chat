import { useContext, useRef } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ChatContext } from "./ChatContext";
import { ArrowUp } from "lucide-react";

type Props = {
    isDisabled?: boolean;
};

const ChatInput = ({ isDisabled }: Props) => {
    const { addMessage, handleInputChange, isLoading, message } =
        useContext(ChatContext);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const canSend = message.trim().length > 0 && !isLoading && !isDisabled;

    const send = () => {
        if (!canSend) return;
        addMessage();
        textareaRef.current?.focus();
    };

    return (
        <div className="border-t border-border bg-background/80 p-3 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-3xl">
                <div className="relative flex items-end rounded-xl border border-border bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
                    <Textarea
                        ref={textareaRef}
                        rows={1}
                        maxRows={6}
                        disabled={isDisabled}
                        placeholder={
                            isDisabled
                                ? "Waiting for the document..."
                                : "Ask about this document..."
                        }
                        autoFocus
                        aria-label="Message"
                        className="scrollbar-w-2 max-h-40 resize-none border-0 bg-transparent py-3 pr-12 pl-3.5 text-sm shadow-none focus-visible:ring-0"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        onChange={handleInputChange}
                        value={message}
                    />

                    <Button
                        size="icon-sm"
                        disabled={!canSend}
                        aria-label="Send message"
                        className="absolute right-2 bottom-2 rounded-lg"
                        onClick={send}
                    >
                        <ArrowUp className="size-4" />
                    </Button>
                </div>

                <p className="mt-1.5 hidden px-1 text-[11px] text-muted-foreground sm:block">
                    Enter to send, Shift + Enter for a new line
                </p>
            </div>
        </div>
    );
};

export default ChatInput;
