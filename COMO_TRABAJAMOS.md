# Cómo trabajamos

Reglas básicas para que los dos trabajemos sobre el mismo proyecto sin pisarnos, sin romper nada y sabiendo siempre qué cambió y por qué. Son pocas a propósito: si una molesta más de lo que ayuda, la cambiamos (y se cambia acá).

Para instalar todo la primera vez, seguí la guía de GitHub. Para ver el proyecto: `pnpm install` y `pnpm dev`.

---

## 1. El ciclo de todos los días

```
git pull          # ANTES de tocar nada: traé lo que hizo el otro
# ... trabajás ...
git status        # mirá qué vas a subir; si ves algo que no reconocés, pará
git add .
git commit -m "Qué cambié y por qué"
git push          # AL TERMINAR: mandá lo tuyo
```

**`git pull` cuando arrancás, `git push` cuando terminás.** Casi todos los problemas salen de trabajar sobre una copia vieja.

---

## 2. Cambios chicos y cambios importantes

No todo necesita revisión. La regla:

| | Ejemplos | Cómo se sube |
|---|---|---|
| **Chico** | Un texto, un typo, un color puntual, un dato de `docs/`, una nota en `PROGRESO.md` | Directo a `main`, con su commit |
| **Importante** | Ver la lista de abajo | En una **rama**, con un **Pull Request** que el otro revisa y aprueba antes de unirlo a `main` |

**Es importante si toca cualquiera de estas cosas:**

- **Cálculos** (`src/lib/calculos/`): una fórmula mal hecha muestra plata equivocada.
- **Datos y fuentes** (`src/lib/data/`): agregar, quitar o cambiar cómo se valida una fuente.
- **Rankings** (`src/lib/rankings/`) y todo lo que tenga que ver con **afiliados** (`src/lib/partners.ts`): la neutralidad es una promesa del producto.
- **Las reglas del proyecto**: `CLAUDE.md`, `docs/DISENO.md`, `docs/PRODUCTO.md` o este archivo.
- **Dependencias** (`package.json`): instalar, sacar o actualizar paquetes.
- **Borrar o mover** archivos o pantallas enteras.
- **Textos legales** (`/legal`, avisos de "no es asesoramiento", disclaimers).
- **Cualquier cambio grande** en una pantalla (más de un par de archivos) o algo de lo que no estés seguro.

Ante la duda, es importante.

### Cómo se hace un cambio importante

```
git pull
git checkout -b nombre-del-cambio      # ej.: tasas-cer, nuevo-ranking-cripto
# ... trabajás y commiteás en la rama ...
git push -u origin nombre-del-cambio
```

Después, en GitHub aparece un botón **"Compare & pull request"**. Escribís qué cambia y por qué, y lo asignás al otro como revisor. El otro:

1. Lo mira en GitHub (pestaña **Files changed**) o lo prueba en su máquina (`git fetch` y `git checkout nombre-del-cambio`).
2. Comenta o pide cambios si hace falta.
3. Cuando está bien, lo aprueba y aprieta **Merge**.

Después, los dos vuelven a `main` y hacen `git pull`.

**Nadie une su propio Pull Request sin la aprobación del otro.** Si es urgente, se avisa por WhatsApp y se revisa igual, aunque sea rápido.

---

## 3. Antes de cada commit

- `git status`: que solo esté lo que querés subir.
- Si tocaste código, que pase todo esto:
  ```
  pnpm typecheck
  pnpm lint
  pnpm test
  ```
- Si es un cambio grande, también `pnpm build`.
- Si tocaste una pantalla, mirala en el navegador en el celular y en la compu, en tema claro y oscuro (o `pnpm shots`).

**Nunca se sube algo que rompe los tests.** Si un test falla, se arregla el código; el test se cambia solo si se demuestra que el test estaba mal.

---

## 4. Mensajes de commit

En castellano, diciendo **qué cambió y por qué**. El historial es nuestro registro de decisiones.

| Mal | Bien |
|---|---|
| `cambios` | `Corrige la TEA de las billeteras: usaba la TNA sin capitalizar` |
| `arreglos` | `Saca Brubank del comparador: la fuente tiene la tasa de 2025` |
| `update` | `Agrega la pantalla de bonos CER con inflación breakeven` |
| `fix` | `El widget mostraba centavos en montos grandes` |

Un commit por cosa terminada, no uno gigante al final de la semana. Así, si algo se rompe, se deshace solo eso.

---

## 5. Orden

- **Cada cosa en su lugar.** La estructura de carpetas está en `CLAUDE.md` ("Estructura"). Si algo nuevo no encaja, se habla antes de inventar una carpeta.
- **`docs/PROGRESO.md` al día.** Cuando terminás algo, actualizás qué está hecho y qué falta.
- **Decisiones a la vista.** Si decidís algo de producto o de diseño por tu cuenta, anotalo en "Decisiones para revisar" de `PROGRESO.md` para que el otro lo vea.
- **Si cambia una regla, se cambia el documento.** Un color nuevo va a `DISENO.md`; un criterio nuevo de ranking va a `/metodologia`. No queda solo en un chat.
- **Pendientes en GitHub Issues**, con dueño. Lo que se habla por WhatsApp se pierde.

---

## 6. Lo que nunca se sube

- **Claves y contraseñas** (`.env.local` y cualquier archivo con una API key). Si se sube una por error, se da de baja ese mismo día: borrarla del repo no alcanza, porque queda en el historial.
- **Datos personales** de usuarios reales o de terceros.
- **Capturas y resultados de pruebas** (`.shots/`, `.lighthouse/`, `test-results/`): ya están bloqueados en `.gitignore`.

**Nunca `git push --force` sobre `main`**: borra el trabajo del otro.

---

## 7. Con Claude Code

Claude Code lee `CLAUDE.md`, que le pide seguir este archivo. Igual, conviene recordárselo:

- Pedíselo así: *"Seguí COMO_TRABAJAMOS.md. Es un cambio importante: hacelo en una rama y abrí un Pull Request."*
- Para cambios importantes, Claude **no sube nada a `main` directamente**: trabaja en una rama y deja el Pull Request para que lo revise el otro.
- Revisá lo que hizo antes de aprobarlo, igual que si lo hubiera hecho el otro.

---

## 8. Si algo sale mal

| Pasó esto | Hacé esto |
|---|---|
| `rejected... fetch first` al hacer push | El otro subió antes: `git pull`, resolvé si hay conflicto y `git push` |
| Aparece un conflicto (`<<<<<<<` en un archivo) | Elegí qué líneas quedan, borrá las marcas y commiteá. Si no estás seguro, preguntale al otro o pedile ayuda a Claude Code |
| Subiste algo que no debías | Avisale al otro **antes** de arreglarlo |
| No entendés en qué estado está todo | `git status` y `git log --oneline -5` |

Lo único que no hay que hacer es borrar la carpeta y volver a clonar: así sí se pierde trabajo.
