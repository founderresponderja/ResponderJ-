import * as React from "react"
import { cn } from "../../lib/utils"

// Contexto para partilhar o estado de carregamento da imagem
const AvatarContext = React.createContext<{
  status: "loading" | "loaded" | "error"
  setStatus: (status: "loading" | "loaded" | "error") => void
} | null>(null)

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading")

  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, alt, ...props }, ref) => {
  const context = React.useContext(AvatarContext)
  
  // Efeito para gerir o carregamento da imagem
  React.useLayoutEffect(() => {
    if (!src) {
        context?.setStatus("error")
        return
    }
    
    // Reset status quando a source muda
    context?.setStatus("loading")
    
    const img = new Image()
    img.src = src as string
    
    const handleLoad = () => context?.setStatus("loaded")
    const handleError = () => context?.setStatus("error")

    img.onload = handleLoad
    img.onerror = handleError
    
    // Verificar se já está em cache
    if (img.complete && img.naturalWidth > 0) {
        handleLoad()
    }
    
    return () => {
        img.onload = null
        img.onerror = null
    }
  }, [src, context])

  // Só mostra a imagem se estiver carregada com sucesso
  if (context?.status !== "loaded") return null

  return (
    <img
      ref={ref}
      src={src as string}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(AvatarContext)

  // Só mostra o fallback se a imagem não estiver carregada (loading ou error)
  if (context?.status === "loaded") return null

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }