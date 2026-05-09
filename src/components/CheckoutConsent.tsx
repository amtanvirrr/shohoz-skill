import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  checked: boolean;
  onChange: (val: boolean) => void;
  className?: string;
}

/**
 * SSLCommerz / Bangladesh payment gateway compliance:
 * Customer must explicitly tick this box (initially unchecked) before placing
 * an order. Links go to /terms, /privacy and /refund.
 */
export const CheckoutConsent = ({ checked, onChange, className }: Props) => (
  <label
    className={`flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs cursor-pointer ${className ?? ""}`}
  >
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      className="mt-0.5"
    />
    <span className="leading-relaxed text-foreground">
      আমি{" "}
      <Link to="/terms" target="_blank" className="text-primary underline">
        ব্যবহারের শর্তাবলী
      </Link>
      ,{" "}
      <Link to="/privacy" target="_blank" className="text-primary underline">
        প্রাইভেসি পলিসি
      </Link>{" "}
      এবং{" "}
      <Link to="/refund" target="_blank" className="text-primary underline">
        রিটার্ন ও রিফান্ড পলিসি
      </Link>{" "}
      পড়েছি ও সম্মত আছি।
    </span>
  </label>
);

export default CheckoutConsent;