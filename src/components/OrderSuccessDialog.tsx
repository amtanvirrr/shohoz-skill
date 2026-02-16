import { CheckCircle, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  productTitle: string;
  message?: string;
  isFree?: boolean;
}

const OrderSuccessDialog = ({ open, onClose, orderId, productTitle, message, isFree }: OrderSuccessDialogProps) => {
  const { toast } = useToast();

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast({ title: "কপি হয়েছে!" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center sm:max-w-lg">
        <DialogTitle className="sr-only">অর্ডার সম্পন্ন</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Animated checkmark */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">
            {isFree ? "সফলভাবে সম্পন্ন! 🎉" : "অর্ডার সফল! 🎉"}
          </h2>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{productTitle}</span> — {message || (isFree ? "আপনার অর্ডারটি কনফার্ম হয়েছে।" : "আপনার অর্ডারটি সফলভাবে জমা হয়েছে।")}
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

          {!isFree && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-left dark:bg-yellow-900/10">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                এই অর্ডার আইডিটি সংরক্ষণ করুন। পেমেন্ট যাচাইয়ের পর আপনার অর্ডার প্রসেস করা হবে।
              </p>
            </div>
          )}

          <Button onClick={onClose} className="mt-2 w-full">ঠিক আছে</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSuccessDialog;
