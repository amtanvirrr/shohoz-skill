import { useMetaPixel } from "@/hooks/useMetaPixel";
import { createContext, useContext, ReactNode } from "react";

interface MetaPixelContextType {
  trackEvent: (eventName: string, params?: Record<string, any>, userData?: Record<string, any>) => void;
  pixelId: string | undefined;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  trackEvent: () => {},
  pixelId: undefined,
});

export const usePixel = () => useContext(MetaPixelContext);

export const MetaPixelProvider = ({ children }: { children: ReactNode }) => {
  const { trackEvent, pixelId } = useMetaPixel();
  return (
    <MetaPixelContext.Provider value={{ trackEvent, pixelId }}>
      {children}
    </MetaPixelContext.Provider>
  );
};
