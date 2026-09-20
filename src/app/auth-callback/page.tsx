"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { trpc } from "../_trpc/client";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Spinner = ({ label }: { label: string }) => (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
            <h3 className="font-medium">{label}</h3>
            <p className="text-sm text-muted-foreground">
                You will be redirected automatically.
            </p>
        </div>
    </div>
);

const AuthCallback = () => {
    const router = useRouter();
    const { redirectToSignIn } = useClerk();
    const searchParams = useSearchParams();
    const origin = searchParams.get("origin");

    const { data, error } = trpc.authCallback.useQuery(undefined, {
        retry: true,
        retryDelay: 500,
    });

    useEffect(() => {
        if (data?.success) {
            router.push(origin ? `/${origin}` : "/dashboard");
        }
    }, [data, origin, router]);

    useEffect(() => {
        if (error?.data?.code === "UNAUTHORIZED") {
            redirectToSignIn();
        }
    }, [error, redirectToSignIn]);

    return <Spinner label="Setting up your account" />;
};

const Page = () => (
    <Suspense fallback={<Spinner label="Loading" />}>
        <AuthCallback />
    </Suspense>
);

export default Page;
