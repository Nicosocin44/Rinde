# Publicar el sitio: de Claude Code a una página con dominio propio

> Responde la duda del audio: "no entiendo cómo pasar de Claude a una página". Está escrito para los fundadores, no para programadores. Claude Code puede hacer casi todo esto con ustedes; las partes que requieren cuentas, pagos o claves las hacen ustedes.

---

## La idea en 30 segundos

1. **El código vive en GitHub** (un repositorio, como una carpeta en la nube con historial de cambios).
2. **Vercel** lee ese repositorio y publica el sitio. Cada vez que Claude Code sube un cambio, el sitio se actualiza solo.
3. **El dominio** (`rinde.com.ar`, por ejemplo) se compra aparte y se "apunta" a Vercel.

```
Claude Code ──(git push)──► GitHub ──(automático)──► Vercel ──► rinde.com.ar
```

---

## Paso a paso

### 1. GitHub
- Creen una cuenta en github.com (gratis) si no tienen.
- En la carpeta del proyecto, pídanle a Claude Code: *"Creá un repositorio privado en GitHub llamado rinde y subí el proyecto"*. Les va a pedir instalar o loguear la herramienta `gh`: sigan sus instrucciones.
- Pueden invitarse mutuamente al repositorio para trabajar los dos.

### 2. Vercel
- Creen una cuenta en vercel.com entrando **con GitHub**.
- "Add New → Project" → elijan el repositorio `rinde` → "Deploy". En un par de minutos tienen una URL del tipo `rinde.vercel.app`.
- **Lo mejor para corregir:** cada rama o cambio genera una **URL de vista previa** propia. Pueden revisar una versión nueva en el celular antes de publicarla.
- Las variables de entorno (claves de APIs, Supabase) se cargan en *Settings → Environment Variables*. Nunca en el código.

> **Importante (plan):** el plan gratuito de Vercel (Hobby) es **solo para uso personal y no comercial**. Mientras el sitio esté en prueba, alcanza. **Cuando haya afiliados, publicidad o cobros, hay que pasar al plan Pro** (pago mensual). Revisen las condiciones vigentes en vercel.com/pricing.

### 3. Dominio
**Opción A: `.com.ar` en NIC Argentina** (el registro oficial)
- Se necesita **CUIT/CUIL y Clave Fiscal nivel 2 o superior**. Se tramita en nic.ar (vía Trámites a Distancia) y se paga con tarjeta. Tiene un costo anual: consulten la tarifa vigente.
- El dominio queda a nombre del CUIT de quien lo registra. **Decidan a nombre de quién va** (o de una sociedad, si arman una).

**Opción B: `.com`** en un registrador internacional (Cloudflare Registrar, Namecheap, etc.). Recomendable registrar también el `.com` para proteger la marca.

### 4. Conectar el dominio con Vercel
- En Vercel: *Project → Settings → Domains → Add* → escriban el dominio.
- Vercel les dice qué registros DNS cargar (un registro A y/o un CNAME). Se cargan en NIC Argentina (en la delegación del dominio) o en el registrador que usen. Alternativa simple: delegar el dominio a los servidores de nombres de Vercel.
- El certificado de seguridad (https) lo pone Vercel solo. La propagación puede tardar desde minutos hasta unas horas.

### 5. Base de datos y cuentas (fase 2)
- Creen un proyecto en supabase.com (tiene plan gratuito para empezar).
- Pasen a Claude Code la URL y las claves **por variables de entorno** (`.env.local` en su computadora y Settings en Vercel). Claude Code arma las tablas y la conexión.

### 6. Tareas programadas (fase 2)
- Las alertas y los snapshots diarios de tasas corren con **Vercel Cron** (se configura en el repo). Claude Code lo deja armado.

### 7. Antes de anunciarlo
- [ ] Dominio funcionando con https.
- [ ] Páginas legales publicadas (términos, privacidad, aviso de afiliados, "no es asesoramiento").
- [ ] Google Search Console verificado y sitemap enviado.
- [ ] Analytics funcionando.
- [ ] Imágenes para compartir (OG) revisadas en WhatsApp, X e Instagram.
- [ ] Probado en un Android y un iPhone reales, también instalado como app (PWA).
- [ ] Velocidad: Core Web Vitals en verde (Vercel Speed Insights o PageSpeed).
- [ ] Revisión legal (ver `PRODUCTO.md` §12).

---

## Costos para tener en el radar

| Concepto | Cuándo |
|---|---|
| Dominio `.com.ar` y/o `.com` | Desde el día que lo registran (anual) |
| Vercel Pro | Cuando el sitio genere ingresos o lo exija el uso |
| Supabase | Gratis al principio; pago si crece mucho |
| Proveedor de datos globales | Fase 3, si se suma |
| Email transaccional (alertas) | Fase 2; suele haber un plan gratuito al principio |

Los precios cambian: consúltenlos en cada sitio al momento de contratar.
