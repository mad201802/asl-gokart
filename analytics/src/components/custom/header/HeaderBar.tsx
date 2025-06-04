import React from 'react';
import { MainNavigationMenu } from '@/components/custom/header/MainNavigationMenu';

export default function HeaderBar() {
    return (
        <header className="flex flex-row items-center mt-2">
            <img src={"/asl-moon.png"} className="w-12 h-12 ml-4 mr-3" alt="asl-gokart logo">
            </img>
            <div id="heading" className="hidden sm:block text-lg font-bold font-mono mr-4">asl-gokart/analytics</div>
            <MainNavigationMenu />
        </header>
    )
}