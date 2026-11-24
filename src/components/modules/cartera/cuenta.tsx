"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { cerrarSesion, pedirCodigo, verificarCodigo, type Sesion } from "@/lib/cuenta/sesion";

const CAMPO = "h-12 w-full rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] outline-none focus:border-accent";

/**
 * La cuenta, dentro de Mi cartera. Sin sesión: una franja para guardarla en la cuenta (se entra con un código que llega
 * al mail, sin contraseña). Con sesión: una línea con el mail y "Cerrar sesión".
 */
export function CuentaCartera({ sesion }: { sesion: Sesion }) {
  const [abierto, setAbierto] = useState(false);
  const toast = useToast();

  if (sesion.estado === "no-disponible" || sesion.estado === "cargando") return null;

  if (sesion.estado === "con") {
    return (
      <p className="text-chico text-text-2" data-testid="cuenta-con-sesion">
        Guardada en tu cuenta (<span className="text-text">{sesion.email}</span>) ·{" "}
        <button
          type="button"
          className="underline decoration-border-strong underline-offset-4 hover:text-text"
          onClick={async () => {
            await cerrarSesion();
            toast("Cerraste sesión. Tu cartera sigue guardada en tu cuenta.");
          }}
        >
          Cerrar sesión
        </button>
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-(--radius-card) border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6" data-testid="cuenta-sin-sesion">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Guardala en tu cuenta</p>
          <p className="text-chico text-text-2">Mirá tu cartera desde el celular o la compu. Entrás con tu mail, sin contraseña.</p>
        </div>
        <Button variante="secundario" tamano="sm" onClick={() => setAbierto(true)} data-testid="abrir-cuenta">
          Entrar con mi mail
        </Button>
      </div>
      <Sheet abierto={abierto} onCambio={setAbierto} titulo="Entrar con tu mail" descripcion="Sin contraseña: te llega un código. Si es la primera vez, la cuenta se crea sola.">
        <Ingreso
          alEntrar={() => {
            setAbierto(false);
            toast("Listo: tu cartera queda guardada en tu cuenta");
          }}
        />
      </Sheet>
    </>
  );
}

function Ingreso({ alEntrar }: { alEntrar: () => void }) {
  const [paso, setPaso] = useState<"mail" | "codigo">("mail");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviarMail = async (e?: FormEvent) => {
    e?.preventDefault();
    setEnviando(true);
    setError(null);
    const err = await pedirCodigo(email.trim());
    setEnviando(false);
    if (err) return setError(err);
    setCodigo("");
    setPaso("codigo");
  };

  const enviarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const err = await verificarCodigo(email.trim(), codigo);
    setEnviando(false);
    if (err) return setError(err);
    alEntrar();
  };

  if (paso === "mail") {
    return (
      <form onSubmit={enviarMail} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-label">Tu mail</span>
          <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@mail.com" className={CAMPO} autoFocus />
        </label>
        {error && (
          <p role="alert" className="text-chico text-loss">
            {error}
          </p>
        )}
        <Button type="submit" variante="primario" disabled={enviando || !email.includes("@")}>
          {enviando ? "Mandando…" : "Mandarme el código"}
        </Button>
        <p className="text-micro">
          Guardamos tu cartera asociada a tu mail para que la veas en cualquier dispositivo. No la compartimos con nadie ni la usamos para otra cosa. Sin cuenta, sigue guardada solo en este navegador.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={enviarCodigo} className="flex flex-col gap-5">
      <p className="text-chico text-text-2">
        Te mandamos un código a <span className="font-medium text-text">{email.trim()}</span>. Si no lo ves, fijate en spam.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-label">Código</span>
        <input
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6,10}"
          maxLength={10}
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          className={`${CAMPO} tabular tracking-[0.3em]`}
          autoFocus
          data-testid="codigo"
        />
      </label>
      {error && (
        <p role="alert" className="text-chico text-loss">
          {error}
        </p>
      )}
      <Button type="submit" variante="primario" disabled={enviando || codigo.length < 6}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-chico text-text-2">
        <button type="button" className="hover:text-text" disabled={enviando} onClick={() => void enviarMail()}>
          Mandarme otro código
        </button>
        <button
          type="button"
          className="hover:text-text"
          onClick={() => {
            setPaso("mail");
            setError(null);
          }}
        >
          Cambiar el mail
        </button>
      </div>
    </form>
  );
}
