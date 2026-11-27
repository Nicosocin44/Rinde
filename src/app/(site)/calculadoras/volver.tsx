"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** "← Todas las calculadoras" arriba de cada calculadora (Calculadoras no tiene solapas: la portada de la sección hace de menú). */
export function VolverCalculadoras() {
  if (usePathname() === "/calculadoras") return null;
  return (
    <Link href="/calculadoras" className="mb-6 inline-flex items-center gap-1.5 self-start text-chico font-medium text-text-2 hover:text-text">
      <ArrowLeft className="size-4" /> Todas las calculadoras
    </Link>
  );
}
