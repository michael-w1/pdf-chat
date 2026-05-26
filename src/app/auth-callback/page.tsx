"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "../_trpc/client";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const origin = searchParams.get("origin");

    const { data, error, isLoading } = trpc.authCallback.useQuery(undefined, {
        retry: true,
        retryDelay: 500,
    });

    useEffect(() => {
        if (data?.success) {
            router.push(origin ? `${origin}` : "/dashboard");
        }
    }, [data, origin, router]);

    useEffect(() => {
        if (error) {
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

const Page = () => {
    return (
        <Suspense fallback={<Loader2 className='h-8 w-8 animate-spin text-slate-800' />}>
            <AuthCallback />
        </Suspense>
    )
};

export default Page;