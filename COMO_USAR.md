# Cómo usar este kit (para nosotros dos)

Este kit tiene todo lo que Claude Code necesita para entender el proyecto y arrancar a construirlo solo.

```
kit-claude-code/
├── COMO_USAR.md              ← este archivo (para ustedes, no para Claude)
├── PROMPT_INICIAL.md         ← el prompt que se pega en Claude Code
├── CLAUDE.md                 ← memoria permanente del proyecto (Claude Code la lee siempre)
├── .claude/skills/revision-visual/SKILL.md   ← comando /revision-visual para auditar el diseño
└── docs/
    ├── CONTEXTO.md           ← nuestra charla, ideas y auditoría de rendimientos.co
    ├── PRODUCTO.md           ← qué construimos, módulos, ideas, monetización y crecimiento
    ├── DISENO.md             ← el sistema de diseño (lo más importante)
    ├── DATOS_Y_FORMULAS.md   ← fuentes de datos, validaciones y fórmulas
    ├── ROADMAP.md            ← fases
    └── DEPLOY.md             ← cómo publicarlo con dominio propio
```

---

## Arranque (una sola vez)

1. **Creen una carpeta vacía** para el proyecto (por ejemplo `rinde`) y copien adentro **todo** el contenido de este kit, respetando la estructura (incluida la carpeta oculta `.claude`).
2. **Si existe el proyecto anterior** con `src/lib/calculos.ts` (TWR y TIR testeadas), copien ese archivo y sus tests a esta carpeta, en `src/lib/calculos.ts`. Claude Code lo va a reutilizar.
3. **Requisitos en la compu:** Claude Code actualizado (`claude update`; para Fable 5.2 hace falta la versión 2.1.321 o posterior) y Node.js 20.9 o superior. Si falta algo, Claude Code les dice cómo instalarlo.
4. Abran una terminal en la carpeta y arranquen Claude Code con Fable:
   ```
   claude --model claude-fable-5-2
   ```
   (o, ya adentro, `/model fable`). Confirmen el modelo con `/status`.
5. Abran `PROMPT_INICIAL.md`, copien **todo lo que está debajo de la línea** y péguenlo.
6. **Déjenlo trabajar.** Es una sesión larga. Va a pedir permisos para crear archivos e instalar paquetes: aceptarlos es lo esperado. Si pregunta algo, respondan corto.
7. Cuando termine: `pnpm dev` y abran **http://localhost:3000**. Las capturas quedan en `.shots/final/` y el estado en `docs/PROGRESO.md`.

---

## Cómo pedir correcciones (para que salgan bien)

- **Un tema por mensaje**, con la ruta: *"En /dolar, la tabla en mobile se ve apretada; quiero menos columnas y más aire."*
- **Adjunten una captura** cuando sea visual. Marquen qué les gusta y qué no.
- **Referencias concretas** ayudan: *"el selector de rango como el de la app Acciones del iPhone"*.
- Si deciden algo que cambia una regla (un color, un nombre, una sección), pídanle: *"y actualizalo en DISENO.md"*. Así no se pierde en la próxima sesión.
- Para una auditoría de diseño completa: `/revision-visual`.
- Si algo salió peor: *"volvé al commit anterior a este cambio"*. Todo queda versionado en git.
- Revisen **"Decisiones para revisar"** en `docs/PROGRESO.md`: ahí está lo que decidió solo.

---

## Consejos de uso

- Fable consume más cuota que otros modelos. Úsenlo para construir y para los cambios grandes; para correcciones chicas pueden pasar a otro modelo con `/model` y volver a Fable después.
- Si una sesión se hace muy larga, pidan: *"actualizá PROGRESO.md con todo lo pendiente"*, cierren y abran una nueva. Arranquen con: *"Leé CLAUDE.md y docs/PROGRESO.md y seguí con lo pendiente"*.
- Cuando quieran publicarlo, sigan `docs/DEPLOY.md` (GitHub → Vercel → dominio).
