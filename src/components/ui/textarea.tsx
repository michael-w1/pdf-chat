
import * as React from "react"
import TextareaAutosize, { TextareaAutosizeProps } from "react-textarea-autosize"; 

import { cn } from "@/lib/utils"

// Wrap the component in React.forwardRef
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextareaAutosize
        data-slot="textarea"
        // Pass the forwarded ref to 'inputRef' so the library handles it correctly
        ref={ref} 
        className={cn(
          "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    )
  }
)

// Set the displayName for better debugging in React DevTools
Textarea.displayName = "Textarea"

export { Textarea }