import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="智测云首页">
      <span className="logo-mark"><Sparkles size={20} strokeWidth={2.2} /></span>
      <span>智测云<small>ZHICE CLOUD</small></span>
    </Link>
  );
}
