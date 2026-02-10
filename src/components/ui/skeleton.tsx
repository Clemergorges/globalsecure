import React from 'react';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
            aria-live="polite"
            aria-busy="true"
        />
    );
}

// Preset skeleton components
export function SkeletonCard() {
    return (
        <div className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
}

export function SkeletonBalance() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-40" />
        </div>
    );
}

export function SkeletonTransaction() {
    return (
        <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <Skeleton className="h-6 w-20" />
        </div>
    );
}
