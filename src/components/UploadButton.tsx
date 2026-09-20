'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'

import Dropzone from 'react-dropzone'
import { CloudUpload, File as FileIcon, Loader2, UploadCloud } from 'lucide-react'
import { Progress } from './ui/progress'
import { toast } from 'sonner'
import { trpc } from '@/app/_trpc/client'
import { useRouter } from 'next/navigation'
import { uploadToBlob } from '@/lib/upload-to-blob'
import { cn } from '@/lib/utils'

const MAX_FILE_BYTES = 4 * 1024 * 1024

const UploadDropzone = ({ onDone }: { onDone: () => void }) => {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const { mutateAsync: createUploadSlot } = trpc.createUploadSlot.useMutation()

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too large', {
        description: 'Please choose a PDF under 4 MB',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // The server names the blob and signs a write-only URL for it.
      const { fileId, uploadUrl } = await createUploadSlot({
        name: file.name,
        size: file.size,
      })

      await uploadToBlob({
        url: uploadUrl,
        file,
        onProgress: setUploadProgress,
      })

      setIsRedirecting(true)

      // Tell the server the bytes have landed. Deliberately not awaited: the
      // document page polls for the result, so there is no reason to hold the
      // dialog open while analysis runs.
      void fetch('/api/files/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }).catch(() => {
        /* The polled status surfaces any failure. */
      })

      await utils.getUserFiles.invalidate()
      onDone()
      router.push(`/dashboard/${fileId}`)
    } catch (err) {
      console.error(err)
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
      setIsUploading(false)
      setIsRedirecting(false)
    }
  }

  return (
    <Dropzone
      multiple={false}
      disabled={isUploading}
      accept={{ 'application/pdf': ['.pdf'] }}
      onDrop={handleDrop}>
      {({ getRootProps, getInputProps, acceptedFiles, isDragActive }) => (
        <div
          {...getRootProps()}
          className={cn(
            'flex h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center transition-colors',
            isDragActive && 'border-brand bg-brand-muted',
            isUploading && 'cursor-default'
          )}>
          <input {...getInputProps()} id='dropzone-file' className='hidden' />

          {!isUploading ? (
            <>
              <span className='flex size-11 items-center justify-center rounded-xl border border-border bg-background'>
                <UploadCloud className='size-5 text-muted-foreground' />
              </span>
              <div className='space-y-1'>
                <p className='text-sm'>
                  <span className='font-medium'>Click to upload</span>
                  <span className='text-muted-foreground'> or drag and drop</span>
                </p>
                <p className='text-xs text-muted-foreground'>PDF, up to 4 MB</p>
              </div>
            </>
          ) : (
            <div className='w-full max-w-xs space-y-3'>
              {acceptedFiles?.[0] ? (
                <div className='mx-auto flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2'>
                  <FileIcon className='size-4 shrink-0 text-brand' />
                  <span className='truncate text-sm'>
                    {acceptedFiles[0].name}
                  </span>
                </div>
              ) : null}

              <Progress
                value={uploadProgress}
                indicatorColour={uploadProgress === 100 ? 'bg-brand' : ''}
                className='h-1'
              />

              <p className='flex items-center justify-center gap-1.5 text-xs text-muted-foreground'>
                {isRedirecting ? (
                  <>
                    <Loader2 className='size-3 animate-spin' />
                    Opening document...
                  </>
                ) : (
                  `Uploading ${uploadProgress}%`
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </Dropzone>
  )
}

const UploadButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size='lg'>
          <CloudUpload className='size-4' />
          Upload PDF
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a PDF</DialogTitle>
          <DialogDescription>
            It will be parsed and indexed so you can ask questions about it.
          </DialogDescription>
        </DialogHeader>

        <UploadDropzone onDone={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton
