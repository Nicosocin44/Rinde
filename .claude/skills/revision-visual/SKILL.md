---
name: revision-visual
description: Revisión visual completa del sitio contra docs/DISENO.md. Saca capturas en mobile, tablet y desktop, en dark y light, pasa el checklist anti "hecho por IA" y corrige lo que falle. Usar después de cambios visuales o cuando los fundadores pidan "revisá el diseño".
---

# Revisión visual

1. Asegurate de que el sitio levante (`pnpm dev` o `pnpm build && pnpm start`).
2. Corré `pnpm shots`. Tiene que generar capturas de cada ruta a 375, 768 y 1440 px de ancho, en dark y light, en `./.shots/<fecha-hora>/`. Si alguna ruta necesita estados especiales (carga, vacío, error), forzalos con un query param de desarrollo (`?estado=carga|vacio|error`) y capturalos también.
3. Abrí y mirá **cada** captura. Para cada pantalla anotá en `docs/PROGRESO.md`, sección "Revisión visual":
   - Qué es lo primero que se ve. ¿Es la respuesta o la cifra más importante?
   - Cualquier ítem de la §2 de `DISENO.md` (prohibidos) que aparezca.
   - Problemas de espaciado, alineación, cortes de texto, contraste o jerarquía.
   - Diferencias de calidad entre dark y light, o entre mobile y desktop.
4. Ordená los problemas por impacto visual y corregí los más importantes primero.
5. Volvé a sacar capturas y compará antes y después.
6. Repetí hasta que todas las pantallas pasen el checklist de la §13 de `DISENO.md`, con un **mínimo de dos rondas**.
7. Revisá en el navegador (no solo en capturas) las interacciones firma de la §7: number ticker, indicadores deslizantes, scrub del gráfico, reordenamiento del ranking, sheets y ⌘K.
8. Cerrá con un resumen corto: qué cambiaste, qué quedó pendiente y por qué.
