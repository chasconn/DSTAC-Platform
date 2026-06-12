# PROMPT FIX V2 — Input resaltado al abrir modal selector
# Solución a la causa raíz, no al síntoma.

---

## CAUSA RAÍZ

Cuando el usuario hace clic en el chip del sidebar, el navegador ejecuta
onMouseDown y mueve el foco al siguiente elemento focusable del DOM
(que resulta ser el input de búsqueda del módulo activo) ANTES de que
el modal monte y el overlay bloquee las interacciones.

Usar CSS para ocultar el outline no soluciona el problema porque el foco
ya ocurrió. Hay que evitar que ocurra.

---

## SOLUCIÓN — Prevenir el foco en el chip con onMouseDown

En el componente del sidebar, donde está el chip de empresa activa,
agregar `onMouseDown` con `preventDefault`:

```jsx
<div
  className="empresa-chip"
  onMouseDown={(e) => {
    // Prevenir que el navegador mueva el foco a otro elemento
    // al hacer clic. Esto debe ir en onMouseDown, no en onClick.
    e.preventDefault()
  }}
  onClick={(e) => {
    e.stopPropagation()
    setModalOpen(true)
  }}
>
  <div className="ec-dot" />
  <div className="ec-name">{empresaActiva?.name}</div>
  <span className="ec-change">cambiar ↓</span>
</div>
```

El `e.preventDefault()` en `onMouseDown` le dice al navegador
"no hagas tu comportamiento por defecto al presionar el botón del mouse",
que incluye mover el foco. El `onClick` sigue funcionando normalmente.

---

## TAMBIÉN — Bloquear foco activo en el módulo al montar el modal

En EmpresaSelectorModal.js, al montar el componente, quitar el foco
del elemento activo actual antes de asignar el foco al buscador del modal:

```javascript
useEffect(() => {
  // 1. Quitar foco del elemento activo actual (el input del módulo)
  if (document.activeElement) {
    document.activeElement.blur()
  }

  // 2. Dar foco al buscador del modal
  const frame = requestAnimationFrame(() => {
    searchRef.current?.focus()
  })

  // 3. Marcar body para CSS de respaldo
  document.body.setAttribute('data-modal-open', 'true')

  return () => {
    cancelAnimationFrame(frame)
    document.body.removeAttribute('data-modal-open')
  }
}, [])
```

---

## VERIFICAR

1. Abrir cualquier módulo — el input de búsqueda NO debe estar resaltado
2. Hacer clic en el chip del sidebar
3. El modal se abre — el input del módulo NO se resalta en ningún momento
4. El buscador del modal recibe el foco automáticamente
5. Cerrar el modal — todo vuelve a la normalidad

---

## ARCHIVOS A TOCAR

- El componente del sidebar donde está el chip (agregar onMouseDown)
- EmpresaSelectorModal.js (agregar blur() antes del focus())

Solo esos dos. Nada más.

