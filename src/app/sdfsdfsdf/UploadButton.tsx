'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button, buttonVariants } from './ui/button'

import Dropzone from 'react-dropzone'
import { Cloud, CloudUpload, File, Loader2 } from 'lucide-react'
import { Progress } from './ui/progress'
import { useUploadThing } from '@/lib/uploadthing'
import { toast} from "sonner"; 
import { trpc } from '@/app/_trpc/client'
import { useRouter } from 'next/navigation'

const UploadDropzone = () => {
  const router = useRouter()

  const [isUploading, setIsUploading] =
    useState<boolean>(false)

  const [uploadProgress, setUploadProgress] =
    useState<number>(0)


  const { startUpload, isUploading: utUploading } =
    useUploadThing(
      'pdfUploader',
      {
        onClientUploadComplete: ([file]) => {
          if (!file?.key) {

          toast.error("Something went wrong",{
            description: 'Missing file key'}
          )

            return
          }

          setUploadProgress(100)

          startPolling({ key: file.key })
        },

        onUploadError: () => {
          toast.error("Upload failed",{
            description: 'Please ensure that file size is less than 4 MB'}
          )

          setIsUploading(false)
        },

        onUploadProgress(p) {
          setUploadProgress(p)
        },
      }
    )

  const { mutate: startPolling } =
    trpc.getFile.useMutation({
      onSuccess: (file) => {
        router.push(`/dashboard/${file.id}`)
      },
      retry: true,
      retryDelay: 500,
    })

  return (
    <Dropzone
      multiple={false}
      accept={{
        'application/pdf': ['.pdf'],
      }}
      onDrop={async (acceptedFiles) => {
        setIsUploading(true)

        await startUpload(acceptedFiles)

        setIsUploading(false)
      }}>
      {({
        getRootProps,
        getInputProps,
        acceptedFiles,
      }) => (
        <div
          {...getRootProps()}
          className='border h-64 m-4 border-dashed border-gray-300 rounded-lg'>
          <div className='flex items-center justify-center h-full w-full'>
            <label
              htmlFor='dropzone-file'
              className='flex flex-col items-center justify-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'>
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <Cloud className='h-6 w-6 text-slate-500 mb-2' />

                <p className='mb-2 text-sm text-slate-700'>
                  <span className='font-semibold'>
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>

                <p className='text-xs text-slate-500'>
                  PDF up to 4MB
                </p>
              </div>

              {acceptedFiles?.[0] ? (
                <div className='max-w-xs bg-white flex items-center rounded-md overflow-hidden outline outline-[1px] outline-slate-200 divide-x divide-slate-200'>
                  <div className='px-3 py-2 h-full grid place-items-center'>
                    <File className='h-4 w-4 text-blue-500' />
                  </div>

                  <div className='px-3 py-2 h-full text-sm truncate'>
                    {acceptedFiles[0].name}
                  </div>
                </div>
              ) : null}

              {isUploading || utUploading ? (
                <div className='w-full mt-4 max-w-xs mx-auto px-4'>
                  <Progress
                    indicatorColour={
                      uploadProgress === 100
                        ? 'bg-green-500'
                        : ''
                    }
                    value={uploadProgress}
                    className='h-1 w-full bg-slate-200'
                  />

                  {uploadProgress === 100 ? (
                    <div className='flex gap-1 items-center justify-center text-sm text-slate-700 text-center pt-2'>
                      <Loader2 className='h-3 w-3 animate-spin' />
                      Redirecting...
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input
                {...getInputProps()}
                type='file'
                id='dropzone-file'
                className='hidden'
              />
            </label>
          </div>
        </div>
      )}
    </Dropzone>
  )
}

const UploadButton = () => {
  const [isOpen, setIsOpen] =
    useState<boolean>(false)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setIsOpen(v)
        }
      }}>
      <DialogTrigger
        onClick={() => setIsOpen(true)}
        asChild>
        <Button className={buttonVariants({
                    variant: "default", 
                    size: 'lg',
                    className: 'bg-slate-800 hover:bg-black hover:text-slate-50 transition-colors cursor-pointer'
                  })}>
          <CloudUpload/>
          Upload PDF
        
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
              <DialogTitle className='text-center'>Upload PDF</DialogTitle>
        </DialogHeader>
        <UploadDropzone
        />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton