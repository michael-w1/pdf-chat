import {redirect} from 'next/navigation'; 
import db from "@/lib/prisma"; 
import Dashboard from "@/components/Dashboard";
import { currentUser } from "@clerk/nextjs/server";

const page = async () => {
    const user = await currentUser();

    if (!user || !user.id) redirect('/auth-callback?origin=dashboard'); 
    const dbUser = await db.user.findFirst({
        where : {
            id : user.id
        }
    })

    if (!dbUser) redirect('/auth-callback?origin=dashboard'); 


    return <Dashboard/>
  
}

export default page;