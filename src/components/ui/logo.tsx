
import Image from "next/image"

export function Logo({ className, showText = true }: { className?: string, showText?: boolean }) {
  const logoPath = "/logo.jpeg"
  return (
    <div className={`relative ${className}`}>
        <Image 
          src={logoPath} 
          alt="Global Secure Send" 
          width={100} 
          height={100} 
          className="object-contain h-full w-auto rounded-full" 
          priority
        />
    </div>
  )
}
