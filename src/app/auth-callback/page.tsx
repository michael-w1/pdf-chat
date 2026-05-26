"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "../_trpc/client";


// const page = () => {
//   const router = useRouter(); 
//   const searchParams = useSearchParams()
//   const origin = searchParams.get("origin")


//   const {data, isLoading} = trpc.authCallback.useQuery(undefined, {
//     onSuccess: ({success}) =>{
//         if (success){
//             router.push(origin ? `${origin}` : `dashboard`)
//         }
//     }, 
//     onError: (err) =>{

//     }
//   })

// }

// export default page;




import { useEffect } from "react";
import { Loader2 } from "lucide-react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { trpc } from "@/app/_trpc/client"; // Adjust this import to your setup

const Page = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const origin = searchParams.get("origin");

    // 1. Fetch data normally without the deprecated callbacks
    const { data, error, isLoading } = trpc.authCallback.useQuery(undefined, {
        retry: true,
        retryDelay: 500,
    });

    // 2. Handle side effects (routing) inside a useEffect
    useEffect(() => {
        if (data?.success) {
            // Redirect to origin or fallback to /dashboard
            router.push(origin ? `${origin}` : "/dashboard");
        }
    }, [data, origin, router]);

    useEffect(() => {
        if (error) {
            // console.error("Authentication failed:", error);
            // Handle your error routing here, e.g., router.push("/sign-in")
            if (error.data?.code === "UNAUTHORIZED") {
                router.push("/sign-in");
            }
        }
    }, [error, router]);


    return (
        <div className='w-full mt-24 flex justify-center'>
            <div className='flex flex-col items-center gap-2'>
                <Loader2 className='h-8 w-8 animate-spin text-slate-800' />
                <h3 className='font-semibold text-xl'>
                    Setting up your account...
                </h3>
                <p>You will be redirected automatically.</p>
            </div>
        </div>
    )
};

export default Page;