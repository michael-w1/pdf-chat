import { notFound, redirect } from "next/navigation";
import db from "@/lib/prisma";
import DocumentWorkspace from "@/components/DocumentWorkspace";
import { createReadUrl } from "@/lib/azure/blob";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

type Props = {
    params: Promise<{
        fileid: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { fileid } = await params;
    const user = await currentUser();
    if (!user?.id) return { title: "Document" };

    const file = await db.file.findFirst({
        where: { id: fileid, userId: user.id },
        select: { name: true },
    });

    return { title: file?.name ?? "Document" };
}

const page = async ({ params }: Props) => {
    const { fileid } = await params;
    const user = await currentUser();
    if (!user || !user.id) redirect(`/auth-callback?origin=dashboard/${fileid}`);

    const file = await db.file.findFirst({
        where: {
            id: fileid,
            userId: user.id,
        },
    });

    if (!file) notFound();

    // The container is private, so the viewer needs a signed URL. It is minted
    // server-side per request and never persisted.
    const url = await createReadUrl(file.blobName);

    return <DocumentWorkspace fileId={file.id} url={url} />;
};

export default page;
