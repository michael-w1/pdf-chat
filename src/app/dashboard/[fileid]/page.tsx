import { notFound, redirect } from "next/navigation";
import db from "../../../lib/prisma";
import ChatWrapper from "@/components/Chat/ChatWrapper";
import PdfRendererClient from "@/components/PdfRenderClient";
import { currentUser } from "@clerk/nextjs/server";

type Props = {
    params: Promise<{
        fileid: string;
    }>;
};

const page = async ({ params }: Props) => {
    const { fileid } = await params;
    const user = await currentUser();
    if (!user || !user.id)
        redirect(`/auth-callback?origin=dashboard/${fileid}`)

    const file = await db.file.findFirst({
        where: {
            id: fileid,
            userId: user.id,
        },
    })

    if (!file) notFound()


    return (



        <div className='flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden'>
            <div className='mx-auto w-full max-w-8xl h-full lg:flex xl:px-2'>
                <div className='flex-1 xl:flex h-full'>
                    <div className='px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6 h-full'>
                        <PdfRendererClient url={file.url} />
                    </div>
                </div>
                <div className='shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0 h-full overflow-hidden'>
                    <ChatWrapper fileId={file.id} />
                </div>
            </div>
        </div>

    )
}




export default page;