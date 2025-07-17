import * as React from "react"
import { cn } from "@/lib/utils"

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={cn("h-10 w-10", className)}
      {...props}
    >
      <path
        fill="#212121"
        d="M192.936 23.013L63.064 23.013L-0.001 128L63.064 232.987L192.936 232.987L256 128Z"
      />
      <path
        fill="#3498DB"
        d="M181.764 45.413L74.236 45.413L32.223 117.8L53.712 156.4L74.236 117.8L112.923 117.8L93.579 152.2L112.923 186.6L164.095 99.4L135.539 99.4L181.764 45.413Z"
      />
    </svg>
  )
}
