import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Expand, Loader2 } from 'lucide-react'
import { Document, Page } from 'react-pdf'
import { toast } from 'sonner'

interface PdfFullscreenProps {
  fileUrl: string
}



const getDialogWidth = () => {
  const dialogW = window.innerWidth * 0.95  // matches 95vw
  return dialogW - 64  // subtract px-8 padding on each side
}

const PdfFullscreen = ({ fileUrl }: PdfFullscreenProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [numPages, setNumPages] = useState<number>()
  const [pageWidth, setPageWidth] = useState<number>(0)

  const handleOpen = () => {
    setIsOpen(true)
    setPageWidth(getDialogWidth())
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) setIsOpen(false)
      }}>
      <DialogTrigger onClick={handleOpen} asChild>
        <Button variant='ghost' className='gap-1.5' aria-label='fullscreen'>
          <Expand className='h-4 w-4' />
        </Button>
      </DialogTrigger>

<DialogContent className='!max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden'>
  <div className='flex-1 overflow-y-auto mt-6'>
    <div className='px-8 pb-4'>
            <Document
              loading={
                <div className='flex justify-center'>
                  <Loader2 className='my-24 h-6 w-6 animate-spin' />
                </div>
              }
              onLoadError={() => {
                toast.error('Error loading PDF', {
                  description: 'Please try again later',
                })
              }}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              file={fileUrl}>
              {new Array(numPages).fill(0).map((_, i) => (
                <Page
                  key={i}
                  width={pageWidth || undefined}
                  pageNumber={i + 1}
                  className='mb-4'
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