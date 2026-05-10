import { CheckCircle, Copy, Package, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState, useCallback } from "react";
import {
  buildOrderMessage,
  type OrderPaymentMethod,
  type OrderProductType,
} from "@/lib/orderMessage";

interface OrderSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  productTitle: string;
  /** Optional override; if omitted we auto-generate from method + type. */
  message?: string;
  isFree?: boolean;
  paymentMethod?: OrderPaymentMethod;
  productType?: OrderProductType;
  /** e.g. "৩-৫ দিন" — sourced from active shipping zone for physical books. */
  deliveryText?: string;
}

const confettiColors = [
  "hsl(var(--primary))",
  "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
];

const ConfettiPiece = ({ index }: { index: number }) => {
  const style: React.CSSProperties = {
    position: "absolute",
    width: `${6 + Math.random() * 6}px`,
    height: `${6 + Math.random() * 6}px`,
    backgroundColor: confettiColors[index % confettiColors.length],
    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
    left: `${5 + Math.random() * 90}%`,
    top: "-10px",
    opacity: 0,
    animation: `confetti-fall ${1.5 + Math.random() * 1.5}s ease-out ${Math.random() * 0.5}s forwards`,
    transform: `rotate(${Math.random() * 360}deg)`,
  };
  return <div style={style} />;
};

const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch {}
};

const OrderSuccessDialog = ({
  open,
  onClose,
  orderId,
  productTitle,
  message,
  isFree,
  paymentMethod,
  productType,
  deliveryText,
}: OrderSuccessDialogProps) => {
  const { toast } = useToast();

  const navigate = useNavigate();

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast({ title: "কপি হয়েছে!" });
  };

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      playSuccessSound();
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Build personalized copy when caller hasn't supplied an explicit override.
  const auto = paymentMethod && productType
    ? buildOrderMessage({ paymentMethod, productType, deliveryText, isFree })
    : null;
  const displayTitle = auto?.title || (isFree ? "সফলভাবে সম্পন্ন! 🎉" : "অর্ডার সফল! 🎉");
  const displayMessage =
    message ||
    auto?.message ||
    (isFree ? "আপনার অর্ডারটি কনফার্ম হয়েছে।" : "আপনার অর্ডারটি সফলভাবে জমা হয়েছে।");
  // Manual / pending payment messaging — show the "save order id" hint
  // only when the user actually needs to wait for verification.
  const showVerificationHint =
    !isFree &&
    paymentMethod !== "cod" &&
    paymentMethod !== "sslcommerz";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center sm:max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">অর্ডার সম্পন্ন</DialogTitle>
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 z-50">
            {Array.from({ length: 40 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>
        )}
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Animated checkmark */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success dark:bg-success/30">
              <CheckCircle className="h-10 w-10 text-success dark:text-success" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">{displayTitle}</h2>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{productTitle}</span>
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {displayMessage}
          </p>

          {/* Order ID */}
          <div className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">অর্ডার আইডি</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{orderId}</span>
              <button onClick={copyOrderId} className="rounded-md p-1 hover:bg-muted" title="কপি করুন">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {showVerificationHint && (
            <div className="flex items-start gap-2 rounded-lg bg-warning px-4 py-3 text-left dark:bg-warning/10">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs text-warning dark:text-warning">
                এই অর্ডার আইডিটি সংরক্ষণ করুন। পেমেন্ট যাচাইয়ের পর আপনার অর্ডার প্রসেস করা হবে।
              </p>
            </div>
          )}

          <div className="mt-2 flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { onClose(); navigate("/dashboard"); }}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              ড্যাশবোর্ড
            </Button>
            <Button className="flex-1" onClick={onClose}>ঠিক আছে</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSuccessDialog;
