import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Expand, Loader2 } from 'lucide-react'
import { Document, Page } from 'react-pdf'
import { toast } from 'sonner'
import { useResizeDetector } from 'react-resize-detector'

interface PdfFullscreenProps {
  fileUrl: string
}

const PdfFullscreen = ({ fileUrl }: PdfFullscreenProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [numPages, setNumPages] = useState<number>()

  // Measuring the container beats computing from window.innerWidth: it stays
  // correct when the viewport is resized while the dialog is open.
  const { width, ref } = useResizeDetector()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon-sm' aria-label='Open fullscreen'>
          <Expand className='size-4' />
        </Button>
      </DialogTrigger>

      <DialogContent className='flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0'>
        <DialogTitle className='sr-only'>Document preview</DialogTitle>

        <div className='scrollbar-w-2 flex-1 overflow-y-auto bg-muted/30'>
          <div ref={ref} className='mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-6'>
            <Document
              loading={
                <div className='flex justify-center py-24'>
                  <Loader2 className='size-6 animate-spin text-muted-foreground' />
                </div>
              }
              onLoadError={() => {
                toast.error('Error loading PDF', {
                  description: 'Please try again later',
                })
              }}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              file={fileUrl}
              className='flex flex-col items-center gap-4'>
              {Array.from({ length: numPages ?? 0 }).map((_, i) => (
                <Page
                  key={i}
                  width={width ? width - 48 : undefined}
                  pageNumber={i + 1}
                  className='shadow-lg shadow-foreground/10'
                />
              ))}
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PdfFullscreen
