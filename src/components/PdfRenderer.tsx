"use client";

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Search,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { toast } from 'sonner'

import { useResizeDetector } from 'react-resize-detector'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useEffect, useState } from 'react'

import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

import PdfFullscreen from './PdfFullscreen'
import { usePdfPage } from './PdfPageContext'

interface PdfRendererProps {
  url: string
}

const ZOOM_LEVELS = [1, 1.5, 2, 2.5]

const PdfRenderer = ({ url }: PdfRendererProps) => {
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
  }, [])

  const [numPages, setNumPages] = useState<number>()
  const [currPage, setCurrPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [renderedScale, setRenderedScale] = useState<number | null>(null)
  const [renderedPage, setRenderedPage] = useState<number | null>(null)

  const isLoading = renderedScale !== scale || renderedPage !== currPage

  const CustomPageValidator = z.object({
    page: z
      .string()
      .refine((num) => Number(num) > 0 && Number(num) <= (numPages ?? 0)),
  })

  type TCustomPageValidator = z.infer<typeof CustomPageValidator>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TCustomPageValidator>({
    defaultValues: { page: '1' },
    resolver: zodResolver(CustomPageValidator),
  })

  const { width, ref } = useResizeDetector()

  // Jump to a page when a citation in the chat is clicked.
  const { subscribe } = usePdfPage()
  useEffect(() => {
    return subscribe((page) => {
      const upperBound = numPages ?? Number.MAX_SAFE_INTEGER
      const target = Math.min(Math.max(1, page), upperBound)
      setCurrPage(target)
      setValue('page', String(target))
    })
  }, [subscribe, numPages, setValue])

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), numPages ?? 1)
    setCurrPage(clamped)
    setValue('page', String(clamped))
  }

  const handlePageSubmit = ({ page }: TCustomPageValidator) => goToPage(Number(page))

  return (
    <div className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card'>
      <div className='flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-2'>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            disabled={currPage <= 1}
            onClick={() => goToPage(currPage - 1)}
            aria-label='Previous page'>
            <ChevronUp className='size-4' />
          </Button>

          <div className='flex items-center gap-1.5 text-sm'>
            <Input
              {...register('page')}
              aria-label='Page number'
              className={cn(
                'h-7 w-11 px-0 text-center text-sm tabular-nums',
                errors.page && 'border-destructive focus-visible:ring-destructive/40'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit(handlePageSubmit)()
              }}
            />
            <span className='text-muted-foreground'>
              / {numPages ?? '–'}
            </span>
          </div>

          <Button
            variant='ghost'
            size='icon-sm'
            disabled={numPages === undefined || currPage >= numPages}
            onClick={() => goToPage(currPage + 1)}
            aria-label='Next page'>
            <ChevronDown className='size-4' />
          </Button>
        </div>

        <div className='flex items-center gap-1'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' aria-label='Zoom'>
                <Search className='size-3.5' />
                <span className='tabular-nums'>{scale * 100}%</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {ZOOM_LEVELS.map((level) => (
                <DropdownMenuItem
                  key={level}
                  onSelect={() => setScale(level)}
                  className='cursor-pointer tabular-nums'>
                  {level * 100}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => setRotation((prev) => prev + 90)}
            aria-label='Rotate 90 degrees'>
            <RotateCw className='size-4' />
          </Button>

          <PdfFullscreen fileUrl={url} />
        </div>
      </div>

      <div className='scrollbar-w-2 flex-1 overflow-auto bg-muted/30'>
        <div ref={ref} className='flex justify-center py-4'>
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
            file={url}
            className='max-w-full'>
            <Page
              className={cn(
                'shadow-lg shadow-foreground/10 transition-opacity duration-200',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              width={width ? width - 32 : undefined}
              pageNumber={currPage}
              scale={scale}
              rotate={rotation}
              loading={
                <div className='flex justify-center py-24'>
                  <Loader2 className='size-6 animate-spin text-muted-foreground' />
                </div>
              }
              onRenderSuccess={() => {
                setRenderedScale(scale)
                setRenderedPage(currPage)
              }}
            />
          </Document>
        </div>
      </div>
    </div>
  )
}

export default PdfRenderer
