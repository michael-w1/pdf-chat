import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { NextRequest } from "next/server";
import db from "../../lib/prisma"
import { pinecone } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai'; 
import { currentUser } from "@clerk/nextjs/server";

export const POST = async (req: NextRequest) => {

    const body = await req.json();



    const user = await currentUser();
    if (!user || !user.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { id: userId } = user;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { fileId, message } = SendMessageValidator.parse(body);

    const file = await db.file.findFirst({
        where: {
            id: fileId,
            userId,
        }
    });

    if (!file)
        return new Response("Not Found", { status: 404 });

   
    await db.message.create({
        data: {
            text: message,
            isUserMessage: true,
            userId,
            fileId
        }
    });

    
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
    });

    const pineconeIndex = pinecone.index("mighty-eucalyptus");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace: fileId,
    });

   
    const results = await vectorStore.similaritySearch(message, 4);


    const prevMessages = await db.message.findMany({
        where: {
            fileId
        },
        orderBy: {
            createdAt: "asc"
        },
        take: 6
    });

    const formattedPrevMessages = prevMessages.map((msg) => ({
        role: msg.isUserMessage ? "user" as const : "assistant" as const,
        content: msg.text
    }));

    
    const result = streamText({
        model: openai("gpt-4o-mini"), // Vercel Provider format
        temperature: 0,
        messages: [
            {
                role: 'system',
                content: 'Use the following pieces of context (or previous conversation if needed) to answer the users question in markdown format.',
            },
            {
                role: 'user',
                content: `Use the following pieces of context (or previous conversation if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
        
                \n----------------\n
                
                PREVIOUS CONVERSATION:
                ${formattedPrevMessages.map((message) => {
                    if (message.role === 'user') return `User: ${message.content}\n`;
                    return `Assistant: ${message.content}\n`;
                }).join('')}
                
                \n----------------\n
                
                CONTEXT:
                ${results.map((r) => r.pageContent).join('\n\n')}
                
                USER INPUT: ${message}`,
            },
        ],
      
        async onFinish({ text }) {
            try {
                await db.message.create({
                    data: {
                        text: text, // finished response 
                        isUserMessage: false,
                        fileId,
                        userId,
                    },
                });
            } catch (error) {
                console.error("Failed to store assistant message in DB:", error);
            }
        },
    });

    
    return result.toTextStreamResponse();
};