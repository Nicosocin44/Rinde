import { describe, expect, it } from "vitest";
import { mensajeError } from "@/lib/cuenta/sesion";

describe("mensajeError (inicio de sesión)", () => {
  it("demasiados pedidos", () => {
    expect(mensajeError({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" })).toMatch(/varios códigos/);
  });
  it("mail mal escrito", () => {
    expect(mensajeError({ status: 400, code: "email_address_invalid", message: "Email address is invalid" })).toMatch(/Revisá el mail/);
    expect(mensajeError({ status: 400, message: "Unable to validate email address: invalid format" })).toMatch(/Revisá el mail/);
  });
  it("código vencido o equivocado", () => {
    expect(mensajeError({ status: 403, code: "otp_expired", message: "Token has expired or is invalid" })).toMatch(/código no es correcto/);
  });
  it("cualquier otra cosa", () => {
    expect(mensajeError({ status: 500, message: "Internal" })).toMatch(/No pudimos conectarnos/);
  });
});
