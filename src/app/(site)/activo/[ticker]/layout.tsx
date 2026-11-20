import { RefrescoEnVivo } from "@/components/shell/refresco-en-vivo";

/** Las fichas traen su precio nuevo solas, sin recargar (ver RefrescoEnVivo). */
export default function FichaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RefrescoEnVivo />
    </>
  );
}
