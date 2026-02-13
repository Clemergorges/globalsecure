
import Image from "next/image"

export function Logo({ className, showText = true }: { className?: string, showText?: boolean }) {
  // Using the path as provided/verified on disk
  const logoPath = "/logo-gss.png/GSS LOG.jpeg"
  
  return (
    <div className={`relative ${className}`}>
        <Image 
          src={logoPath} 
          alt="Global Secure Send" 
          width={100} 
          height={100} 
          className="object-contain h-full w-auto" 
          priority
        />
    </div>
  )
}
