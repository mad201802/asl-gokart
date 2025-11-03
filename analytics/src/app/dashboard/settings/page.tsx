import UserCard from "@/components/custom/cards/UserCard";
import HeaderBar from "@/components/custom/header/HeaderBar";
import { HydrateClient } from "@/trpc/server";

export default function SettingsPage() {
    return (
        <HydrateClient>
            <HeaderBar />
            <div className="p-4">
                <UserCard />
            </div>
        </HydrateClient>
    )
}