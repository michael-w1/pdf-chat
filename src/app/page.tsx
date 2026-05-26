import { UploadCloud, UserPlus, MessageSquare } from 'lucide-react'

export default function Home() {
  return (
    <>
      <div className='mx-auto mb-32 mt-24 max-w-5xl sm:mt-40 px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center mb-16'>
          <h2 className='font-bold text-3xl tracking-tight text-slate-900 sm:text-4xl'>
            Start chatting with your PDF in 3 steps
          </h2>
          {/* <p className='mt-4 text-slate-600 sm:text-lg'>
            Interacting with your data has never been this intuitive. 
            Here is how you can jump in right now.
          </p> */}
        </div>

        {/* Steps Grid */}
        <div className='grid grid-cols-1 gap-8 md:grid-cols-3 border-t border-slate-200 pt-10'>
          {/* Step 1 */}
          <div className='flex flex-col space-y-3 p-4 rounded-xl transition-colors duration-200'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 border border-slate-300'>
                <UserPlus className='h-5 w-5' />
              </div>
              <span className='text-xs font-semibold uppercase tracking-wider text-slate-600'>Step 1</span>
            </div>
            <h3 className='text-lg font-bold text-slate-900 pt-2'>Sign up for an account</h3>
            <p className='text-slate-600 text-sm leading-relaxed'>
              Start out with an account to chat with your PDFs
            </p>
          </div>

          {/* Step 2 */}
          <div className='flex flex-col space-y-3 p-4 rounded-xl transition-colors duration-200'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 border border-slate-300'>
                <UploadCloud className='h-5 w-5' />
              </div>
              <span className='text-xs font-semibold uppercase tracking-wider text-slate-600'>Step 2</span>
            </div>
            <h3 className='text-lg font-bold text-slate-900 pt-2'>Upload your PDF file</h3>
            <p className='text-slate-600 text-sm leading-relaxed'>
              Upload your file to our secure dashboard, and we&apos;ll process the data so it&apos;s  ready to answer your questions.
            </p>
          </div>

          {/* Step 3 */}
          <div className='flex flex-col space-y-3 p-4 rounded-xl transition-colors duration-200'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 border border-slate-300'>
                <MessageSquare className='h-5 w-5' />
              </div>
              <span className='text-xs font-semibold uppercase tracking-wider text-slate-600'>Step 3</span>
            </div>
            <h3 className='text-lg font-bold text-slate-900 pt-2'>Start asking questions</h3>
            <p className='text-slate-600 text-sm leading-relaxed'>
              Ask questions, extract insights, and summarize long readings in seconds.
            </p>
          </div>
        </div>


      </div>
    </>
  )
}