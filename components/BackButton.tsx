"use client";

import { useRouter } from "next/navigation";

const BackButton = () => {
    const router = useRouter();

    const toHome = () => router.push('/');

    return (
        <div className="flex flex-row w-full">
            <button type="button" className="py-2 px-2 bg-gray-100 rounded-lg text-sm" onClick={toHome}>{`<<`} Back to Home</button>
        </div>
    )
}

export default BackButton