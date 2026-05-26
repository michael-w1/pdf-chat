import { createUploadthing, type FileRouter } from "uploadthing/next";
import db from "../../../lib/prisma"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { pinecone } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { currentUser } from "@clerk/nextjs/server";

// 🚀 FIX: Explicitly direct Next.js to pull the worker file accurately
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

const f = createUploadthing();

// const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({
    pdf: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {


      const user = await currentUser();
      if (!user || !user.id) throw new Error('Unauthorized');

      return { userId: user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // console.log("nUploadComplete triggered", file.ufsUrl); 
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: file.ufsUrl,
          uploadStatus: "PROCESSING"
        }
      })


      try {
        const res = await fetch(file.ufsUrl);
        const blob = await res.blob()

        const loader = new PDFLoader(blob);
        const pageLevelDocs = await loader.load();
        const pagesAmt = pageLevelDocs.length;

        // Vectorize and index the document 


        const pineconeIndex = pinecone.index("mighty-eucalyptus");
        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY
        })

        // await PineconeStore.fromDocuments(pageLevelDocs, embeddings,
        //   {
        //     pineconeIndex,
        //     namespace: createdFile.id
        //   }
        // )

        const vectorStore = new PineconeStore(embeddings, {
          pineconeIndex,
          namespace: createdFile.id,
        });

        // Then pass your documents into it
        await vectorStore.addDocuments(pageLevelDocs);

        await db.file.update({
          data: {
            uploadStatus: "SUCCESS"
          },
          where: {
            id: createdFile.id
          }
        })





      } catch (err) {

        console.error("Upload processing failed:", err); 
        console.error("File URL:", file.ufsUrl);

        // stop polling
        try {
          await db.file.update({
            data: {
              uploadStatus: "FAILED"
            },
            where: {
              id: createdFile.id
            }
          });
          // console.log(`Successfully marked file ${createdFile.id} as FAILED`);
        } catch (dbErr) {
          console.error("Could not update status to FAILED in database:", dbErr);
        }


      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
