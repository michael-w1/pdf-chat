import { cn } from '@/lib/utils'
import { ExtendedMessage } from '@/types/message'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { forwardRef } from 'react'
import { Sparkles, User } from 'lucide-react'
import { usePdfPage } from '../PdfPageContext'

interface MessageProps {
    message: ExtendedMessage
    isNextMessageSamePerson: boolean
}

const Message = forwardRef<HTMLDivElement, MessageProps>(
    ({ message, isNextMessageSamePerson }, ref) => {
        const { goToPage } = usePdfPage()
        const isUser = message.isUserMessage
        const sourcePages = !isUser ? message.sourcePages ?? [] : []
        const isLoading = message.id === 'loading-message'

        return (
            <div
                ref={ref}
                className={cn('flex items-end gap-2', isUser && 'justify-end')}>
                <div
                    className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full border border-border',
                        isUser
                            ? 'order-2 bg-primary text-primary-foreground'
                            : 'order-1 bg-muted text-muted-foreground',
                        isNextMessageSamePerson && 'invisible'
                    )}>
                    {isUser ? (
                        <User className='size-3.5' />
                    ) : (
                        <Sparkles className='size-3.5' />
                    )}
                </div>

                <div
                    className={cn(
                        'flex max-w-[min(32rem,85%)] flex-col gap-1.5',
                        isUser ? 'order-1 items-end' : 'order-2 items-start'
                    )}>
                    <div
                        className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm',
                            isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground',
                            !isNextMessageSamePerson &&
                                (isUser ? 'rounded-br-sm' : 'rounded-bl-sm')
                        )}>
                        {typeof message.text === 'string' ? (
                            <div
                                className={cn(
                                    'space-y-2 leading-relaxed',
                                    '[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:my-0.5',
                                    '[&_strong]:font-semibold',
                                    '[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold',
                                    '[&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:font-medium [&_td]:py-0.5 [&_th]:py-0.5',
                                    isUser && '[&_a]:text-primary-foreground'
                                )}>
                                <ReactMarkdown
                                    components={{
                                        pre: ({ children }) => (
                                            <pre
                                                className={cn(
                                                    'scrollbar-w-2 overflow-x-auto rounded-md p-2.5 text-xs',
                                                    isUser
                                                        ? 'bg-primary-foreground/10'
                                                        : 'bg-background'
                                                )}>
                                                {children}
                                            </pre>
                                        ),
                                        code: ({ children }) => (
                                            <code
                                                className={cn(
                                                    'rounded px-1 py-0.5 font-mono text-[0.85em]',
                                                    isUser
                                                        ? 'bg-primary-foreground/10'
                                                        : 'bg-background'
                                                )}>
                                                {children}
                                            </code>
                                        ),
                                    }}>
                                    {message.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            message.text
                        )}
                    </div>

                    {sourcePages.length > 0 ? (
                        <div className='flex flex-wrap items-center gap-1.5'>
                            <span className='text-xs text-muted-foreground'>
                                Sources
                            </span>
                            {sourcePages.map((page) => (
                                <button
                                    key={page}
                                    type='button'
                                    onClick={() => goToPage(page)}
                                    aria-label={`Go to page ${page}`}
                                    className='rounded-full border border-brand/30 bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:ring-3 focus-visible:ring-brand/40 focus-visible:outline-none'>
                                    p. {page}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {!isLoading ? (
                        <time
                            dateTime={new Date(message.createdAt).toISOString()}
                            className='px-1 text-[11px] text-muted-foreground'>
                            {format(new Date(message.createdAt), 'HH:mm')}
                        </time>
                    ) : null}
                </div>
            </div>
        )
    }
)

Message.displayName = 'Message'

export default Message
