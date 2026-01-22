import React from 'react';
import { Sparkles } from 'lucide-react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showIcon = true }) => {
    const sizes = {
        sm: { text: 'text-xl', icon: 20 },
        md: { text: 'text-3xl', icon: 32 },
        lg: { text: 'text-4xl', icon: 40 },
    };

    const currentSize = sizes[size];

    return (
        <div className="flex items-center gap-3">
            <img
                src="/logo_png.png"
                alt="Logo"
                className={`${size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'} object-cover rounded-lg`}
            />
            <div className={`font-bold ${currentSize.text} text-primary-600`}>
                <span className="text-slate-700 dark:text-white">Control</span>
            </div>
        </div>
    );
};
