import Image from "next/image"

export function Logo({ className, showText = true }: { className?: string, showText?: boolean }) {
  return (
    <div className={className}>
        <Image src="/logo-gss.png/GSS LOG.jpeg" alt="Global Secure Send" width={40} height={40} className="object-contain" />
    </div>
  )
}
