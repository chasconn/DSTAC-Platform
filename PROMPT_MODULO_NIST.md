# PROMPT — Módulo NIST CSF (Panel Interno DSTAC)
# Lee CLAUDE.md antes de empezar.
# Este es el módulo más complejo del sistema. Leer completo antes de codear.
# Referencia visual: las 4 capturas adjuntas en el proyecto.

---

## CONTEXTO

El módulo NIST CSF permite a DSTAC evaluar la madurez de ciberseguridad
de cada cliente usando el framework NIST Cybersecurity Framework 2.0.
Los controles son reales (no inventados) y se precargan como seed data.
Cada empresa tiene su propia evaluación independiente.

---

## PARTE 1 — SCHEMA DE BD (db_dstac_core)

```sql
-- Funciones del NIST CSF (5 funciones fijas)
CREATE TABLE nist_functions (
  id          VARCHAR(2)   PRIMARY KEY,  -- ID, PR, DE, RS, RC
  code        VARCHAR(10)  NOT NULL,     -- IDENTIFICAR, PROTEGER, etc.
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(7)   NOT NULL,     -- color para UI
  order_num   INT          NOT NULL
);

-- Categorías por función (ej: ID.AM, ID.BE, ID.GV...)
CREATE TABLE nist_categories (
  id          VARCHAR(10)  PRIMARY KEY,  -- ID.AM, PR.AC, etc.
  function_id VARCHAR(2)   NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  FOREIGN KEY (function_id) REFERENCES nist_functions(id)
);

-- Controles reales del NIST CSF 2.0
CREATE TABLE nist_controls (
  id          VARCHAR(15)  PRIMARY KEY,  -- ID.AM-01, PR.AC-01, etc.
  category_id VARCHAR(10)  NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  data_source VARCHAR(50),  -- activos, personal, identidades, accesos, incidentes, documentos
  checklist   JSON,         -- array de strings con items del checklist
  order_num   INT,
  FOREIGN KEY (category_id) REFERENCES nist_categories(id)
);

-- Evaluación NIST por empresa (una evaluación activa por empresa)
CREATE TABLE nist_evaluations (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  company_id   INT          NOT NULL,
  evaluator_id INT          NOT NULL,  -- user_id de quien evalúa
  status       ENUM('borrador','activa','archivada') DEFAULT 'activa',
  score_total  DECIMAL(5,2) DEFAULT 0,
  evaluated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)   REFERENCES companies(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

-- Assessment por control (estado de cada control en una evaluación)
CREATE TABLE nist_control_assessments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id   INT          NOT NULL,
  control_id      VARCHAR(15)  NOT NULL,
  status          ENUM('pendiente','parcial','implementado','no_aplica') DEFAULT 'pendiente',
  progress        INT          DEFAULT 0,   -- 0-100
  current_value   INT          DEFAULT 0,   -- ej: 35 activos documentados
  max_value       INT          DEFAULT 0,   -- ej: 60 activos totales
  checklist_items JSON,                     -- { "item": bool } por cada item del checklist
  notes_dstac     TEXT,
  updated_by      INT,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
  FOREIGN KEY (updated_by)    REFERENCES users(id)
);

-- Evidencias asociadas a controles
CREATE TABLE nist_evidences (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT          NOT NULL,
  control_id    VARCHAR(15)  NOT NULL,
  company_id    INT          NOT NULL,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type     VARCHAR(50),
  file_size     INT,
  file_path     VARCHAR(500),
  status        ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
  uploaded_by   INT          NOT NULL,
  reviewed_by   INT,
  reviewed_at   TIMESTAMP    NULL,
  comments      TEXT,
  expires_at    DATE         NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
  FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id),
  FOREIGN KEY (uploaded_by)   REFERENCES users(id),
  FOREIGN KEY (reviewed_by)   REFERENCES users(id)
);

-- Historial de cambios (auditoría completa)
CREATE TABLE nist_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT          NOT NULL,
  control_id    VARCHAR(15)  NULL,
  company_id    INT          NOT NULL,
  event_type    ENUM('control_actualizado','evidencia_agregada','evidencia_aprobada',
                     'evidencia_rechazada','comentario_agregado','estado_cambiado',
                     'evaluacion_creada') NOT NULL,
  user_id       INT          NOT NULL,
  previous_data JSON,        -- estado anterior
  new_data      JSON,        -- estado nuevo
  comment       TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
  FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id),
  FOREIGN KEY (user_id)       REFERENCES users(id)
);

-- Plan de acción (tareas generadas desde controles pendientes/parciales)
CREATE TABLE nist_action_plans (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id   INT          NOT NULL,
  control_id      VARCHAR(15)  NOT NULL,
  company_id      INT          NOT NULL,
  priority        ENUM('critica','alta','media','baja') DEFAULT 'media',
  status          ENUM('pendiente','en_progreso','completada','cancelada') DEFAULT 'pendiente',
  responsible     VARCHAR(200),
  due_date        DATE,
  action          TEXT         NOT NULL,  -- acción recomendada
  evidence_needed TEXT,
  comment_dstac   TEXT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES nist_evaluations(id),
  FOREIGN KEY (control_id)    REFERENCES nist_controls(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id)
);
```

---

## PARTE 2 — SEED DATA (controles reales NIST CSF 2.0)

Investigar y cargar los controles reales del NIST Cybersecurity Framework 2.0.
Crear archivo: `apps/api/seeds/nist_seed.js`

Estructura de los datos a cargar:

```javascript
// FUNCIONES
const FUNCTIONS = [
  { id: 'ID', code: 'IDENTIFICAR', name: 'Identificar',
    description: 'Desarrollar entendimiento organizacional para gestionar el riesgo de ciberseguridad',
    color: '#E24B4A', order_num: 1 },
  { id: 'PR', code: 'PROTEGER', name: 'Proteger',
    description: 'Desarrollar e implementar salvaguardas apropiadas',
    color: '#1D9E75', order_num: 2 },
  { id: 'DE', code: 'DETECTAR', name: 'Detectar',
    description: 'Desarrollar e implementar actividades para identificar ocurrencia de eventos',
    color: '#E24B4A', order_num: 3 },
  { id: 'RS', code: 'RESPONDER', name: 'Responder',
    description: 'Desarrollar e implementar actividades ante incidentes detectados',
    color: '#EF9F27', order_num: 4 },
  { id: 'RC', code: 'RECUPERAR', name: 'Recuperar',
    description: 'Desarrollar e implementar actividades para restaurar capacidades',
    color: '#EF9F27', order_num: 5 },
]

// CATEGORÍAS Y CONTROLES — Investigar y cargar todos los reales del NIST CSF 2.0
// Ejemplos de estructura (completar con TODOS los controles reales):

// IDENTIFICAR
// ID.AM — Gestión de Activos
// ID.AM-01: Inventario de activos físicos mantenido
// ID.AM-02: Inventario de plataformas de software mantenido
// ID.AM-03: Representaciones de redes de comunicación mantenidas
// ID.AM-04: Inventario de servicios externos mantenido
// ID.AM-05: Activos priorizados según criticidad
// ID.AM-07: Inventarios de datos mantenidos
// ID.AM-08: Sistemas, hardware, software, servicios con ciclo de vida gestionado
// data_source para todos: 'activos'

// ID.BE — Entorno Empresarial
// ID.BE-01: Rol en la cadena de suministro documentado
// ID.BE-02: Lugar en la infraestructura crítica documentado
// ID.BE-03: Prioridades para misión, objetivos y actividades establecidas
// ID.BE-04: Dependencias y funciones críticas establecidas
// ID.BE-05: Requisitos de resiliencia para soportar servicios críticos establecidos

// ID.GV — Gobernanza
// ID.GV-01: Política de ciberseguridad establecida
// ID.GV-02: Roles y responsabilidades de ciberseguridad coordinados
// ID.GV-03: Requisitos legales y regulatorios entendidos
// ID.GV-04: Estrategia de gobernanza de riesgos establecida
// ID.GV-05: Resultados de evaluación de riesgos informan decisiones
// ID.GV-06: Política de ciberseguridad revisada y actualizada
// data_source: 'documentos'

// ID.RA — Gestión de Riesgos
// ID.RA-01: Vulnerabilidades de activos identificadas
// ID.RA-02: Inteligencia de amenazas cibernéticas recibida
// ID.RA-03: Amenazas identificadas y documentadas
// ID.RA-04: Impactos potenciales evaluados
// ID.RA-05: Amenazas, vulnerabilidades, probabilidades e impactos priorizados
// ID.RA-06: Respuestas a riesgos seleccionadas
// ID.RA-07: Cambios y excepciones de gestión de riesgos documentados
// ID.RA-08: Proceso para reportar problemas de ciberseguridad establecido
// ID.RA-09: Autenticidad e integridad de hardware y software verificados
// ID.RA-10: Proveedores críticos evaluados

// ID.IM — Mejoras
// ID.IM-01: Mejoras identificadas de evaluaciones de ciberseguridad
// ID.IM-02: Mejoras identificadas de ejercicios de ciberseguridad
// ID.IM-03: Mejoras identificadas de incidentes de ciberseguridad
// ID.IM-04: Plan de comunicación con proveedores y socios establecido

// PROTEGER
// PR.AA — Gestión de Identidades y Accesos
// PR.AA-01: Identidades y credenciales gestionadas para usuarios autorizados
// PR.AA-02: Identidades verificadas antes de acceso a activos
// PR.AA-03: Usuarios, servicios y hardware autenticados
// PR.AA-04: Declaraciones de identidad protegidas
// PR.AA-05: Acceso a activos gestionado según principio mínimo privilegio
// PR.AA-06: Acceso físico a activos gestionado y protegido
// data_source: 'identidades,accesos'

// PR.AT — Concienciación y Capacitación
// PR.AT-01: Personal informado y capacitado en ciberseguridad
// PR.AT-02: Personal privilegiado con capacitación especializada
// data_source: 'personal'

// PR.DS — Seguridad de Datos
// PR.DS-01: Datos en reposo protegidos
// PR.DS-02: Datos en tránsito protegidos
// PR.DS-10: Datos en uso protegidos
// PR.DS-11: Copias de seguridad de datos mantenidas

// PR.PS — Seguridad de Plataformas
// PR.PS-01: Configuraciones de plataformas establecidas y mantenidas
// PR.PS-02: Software mantenido para reducir vulnerabilidades
// PR.PS-03: Hardware mantenido para reducir vulnerabilidades
// PR.PS-04: Registros generados para investigación de incidentes
// PR.PS-05: Instalación y ejecución de software no autorizado prevenida
// PR.PS-06: Prácticas seguras de desarrollo de software empleadas
// data_source: 'activos'

// PR.IR — Gestión de Tecnología de la Resiliencia de la Infraestructura
// PR.IR-01: Redes y entornos protegidos de acceso no autorizado
// PR.IR-02: Entornos informáticos protegidos de actividades no autorizadas
// PR.IR-03: Mecanismos de contención implementados
// PR.IR-04: Recursos adecuados para asegurar resiliencia

// DETECTAR
// DE.AE — Análisis de Eventos Adversos
// DE.AE-02: Eventos anómalos analizados para caracterizar amenazas
// DE.AE-03: Información sobre eventos de ciberseguridad correlacionada
// DE.AE-04: Impacto de eventos estimado
// DE.AE-06: Información sobre eventos compartida con partes autorizadas
// DE.AE-07: Inteligencia de amenazas cibernéticas recibida
// DE.AE-08: Incidentes declarados según criterios predefinidos
// data_source: 'incidentes'

// DE.CM — Monitoreo Continuo
// DE.CM-01: Redes monitoreadas para detectar eventos adversos potenciales
// DE.CM-02: Entorno físico monitoreado para detectar eventos adversos
// DE.CM-03: Actividad de personal monitoreada para detectar eventos adversos
// DE.CM-06: Actividad de proveedor externo monitorizada
// DE.CM-09: Capacidades de computación monitoreadas

// RESPONDER
// RS.MA — Gestión de Incidentes
// RS.MA-01: Plan de respuesta a incidentes ejecutado
// RS.MA-02: Incidentes triageados
// RS.MA-03: Incidentes categorizados y priorizados
// RS.MA-04: Incidentes escalados o elevados según necesidad
// RS.MA-05: Criterios para iniciar recuperación de incidentes definidos
// data_source: 'incidentes'

// RS.AN — Análisis de Incidentes
// RS.AN-03: Análisis realizados para establecer qué ha ocurrido
// RS.AN-06: Acciones realizadas durante investigación documentadas
// RS.AN-07: Causa raíz de incidente establecida
// RS.AN-08: Estimaciones de efectos del incidente establecidas

// RS.CO — Comunicación de Incidentes
// RS.CO-02: Personal reporta eventos observados
// RS.CO-03: Información compartida con partes autorizadas
// RS.CO-04: Coordinación con partes interesadas realizada
// RS.CO-05: Divulgación voluntaria de información a partes externas

// RS.MI — Mitigación de Incidentes
// RS.MI-01: Incidentes contenidos
// RS.MI-02: Incidentes erradicados

// RECUPERAR
// RC.RP — Ejecución del Plan de Recuperación
// RC.RP-01: Plan de recuperación ejecutado
// RC.RP-02: Plan de recuperación actualizado según lecciones aprendidas
// RC.RP-03: Integridad de copias de seguridad y activos restaurados verificada
// RC.RP-04: Capacidades y servicios críticos restaurados
// RC.RP-05: Fin de recuperación de incidente declarado
// RC.RP-06: Criterios para reanudar operaciones normales establecidos
// data_source: 'documentos'

// RC.CO — Comunicación de Recuperación
// RC.CO-03: Actividades de recuperación comunicadas internamente
// RC.CO-04: Actualizaciones de recuperación comunicadas a partes interesadas

// CHECKLIST por control (ejemplos — completar para todos):
// ID.AM-01 checklist:
// ["Inventario existe y está documentado",
//  "Responsable de activos asignado",
//  "Activos críticos identificados",
//  "Documentación completa y actualizada",
//  "Ciclo de vida de activos definido"]

// PR.AA-01 checklist:
// ["Gestión de identidades implementada",
//  "Contraseñas con política definida",
//  "MFA habilitado para cuentas críticas",
//  "Cuentas inactivas desactivadas",
//  "Credenciales comprometidas revocadas"]
```

---

## PARTE 3 — BACKEND

### Archivo: apps/api/routes/admin/nist.js

Rutas requieren: `requireAuth` + `requireDstacRole`
Header requerido: `X-Company-Slug` (igual que otros módulos)

```javascript
// ── EVALUACIONES ──
GET  /api/admin/nist/evaluacion          → obtener evaluación activa de la empresa
POST /api/admin/nist/evaluacion          → crear nueva evaluación

// ── FUNCIONES Y CONTROLES (datos globales, no por empresa) ──
GET  /api/admin/nist/functions           → 5 funciones con scores de la evaluación activa
GET  /api/admin/nist/functions/:id       → detalle de una función con sus categorías
GET  /api/admin/nist/controls            → controles con filtros (function_id, category_id, status)
GET  /api/admin/nist/controls/:id        → detalle de un control con su assessment

// ── ASSESSMENTS (estado de controles por empresa) ──
PUT  /api/admin/nist/assessments/:controlId → actualizar estado, progreso, checklist, notas
// Al actualizar → crear entrada en nist_history automáticamente

// ── EVIDENCIAS ──
GET    /api/admin/nist/evidencias        → listar evidencias con filtros
POST   /api/admin/nist/evidencias        → subir evidencia (multipart/form-data)
PUT    /api/admin/nist/evidencias/:id    → aprobar/rechazar evidencia
DELETE /api/admin/nist/evidencias/:id   → eliminar evidencia

// ── HISTORIAL ──
GET  /api/admin/nist/historial           → línea de tiempo con filtros

// ── PLAN DE ACCIÓN ──
GET  /api/admin/nist/plan-accion         → listar tareas
POST /api/admin/nist/plan-accion         → crear tarea manual
PUT  /api/admin/nist/plan-accion/:id     → actualizar tarea
POST /api/admin/nist/plan-accion/generar → generar tareas automáticas desde controles pendientes/parciales

// ── STATS ──
GET  /api/admin/nist/stats               → scores por función + madurez general

// ── DATOS CONECTADOS (de la BD operacional del cliente) ──
GET  /api/admin/nist/data/activos        → activos del cliente para panel de control
GET  /api/admin/nist/data/identidades    → identidades del cliente
GET  /api/admin/nist/data/accesos        → accesos del cliente
GET  /api/admin/nist/data/personal       → personal del cliente
```

### Cálculo de scores

```javascript
// Score de una función = promedio de (progress de sus controles que no son no_aplica)
// Score general = promedio de los 5 scores de función
// Actualizar nist_evaluations.score_total al guardar cualquier assessment

async function recalcularScores(evaluationId) {
  // Para cada función, calcular promedio de progress de sus controles
  const [functions] = await centralDB.execute('SELECT id FROM nist_functions')

  let totalScore = 0
  for (const fn of functions) {
    const [result] = await centralDB.execute(`
      SELECT AVG(nca.progress) AS avg_progress
      FROM nist_control_assessments nca
      JOIN nist_controls nc ON nca.control_id = nc.id
      JOIN nist_categories ncat ON nc.category_id = ncat.id
      WHERE nca.evaluation_id = ?
        AND ncat.function_id = ?
        AND nca.status != 'no_aplica'
    `, [evaluationId, fn.id])
    totalScore += result[0].avg_progress ?? 0
  }

  await centralDB.execute(
    'UPDATE nist_evaluations SET score_total = ? WHERE id = ?',
    [totalScore / functions.length, evaluationId]
  )
}
```

### Auto-registro en historial al actualizar assessment

```javascript
// Cada vez que se actualiza un assessment, registrar en nist_history:
await centralDB.execute(`
  INSERT INTO nist_history
  (evaluation_id, control_id, company_id, event_type, user_id, previous_data, new_data, comment)
  VALUES (?, ?, ?, 'control_actualizado', ?, ?, ?, ?)
`, [evaluationId, controlId, companyId, userId,
    JSON.stringify(previousData), JSON.stringify(newData), comment])
```

---

## PARTE 4 — FRONTEND

### Estructura de archivos

```
apps/web/app/(admin)/nist/
├── page.js                          ← Vista principal (lista de funciones)
├── [functionId]/
│   └── page.js                      ← Vista de función con pestañas
└── components/
    ├── NistOverview.js              ← Cards de madurez general
    ├── FunctionCard.js              ← Card de cada función
    ├── FunctionTabs.js              ← Pestañas: Resumen/Controles/Evidencias/Plan/Historial
    ├── tabs/
    │   ├── ResumenTab.js
    │   ├── ControlesTab.js
    │   ├── EvidenciasTab.js
    │   ├── PlanAccionTab.js
    │   └── HistorialTab.js
    ├── panels/
    │   ├── ControlPanel.js          ← Panel lateral derecho de control
    │   ├── EvidenciaPanel.js        ← Panel lateral derecho de evidencia
    │   └── HistorialPanel.js        ← Panel lateral derecho de evento
    └── NistScoreRing.js             ← Componente anillo SVG reutilizable
```

### page.js — Vista principal

```jsx
// Layout: 2 columnas
// Izquierda: card "Madurez NIST CSF" con anillo grande (score general) + 5 function cards
// Derecha: "Resumen de madurez por función" (5 anillos pequeños) +
//          al hacer clic en una función → panel expandido con sus pestañas

// Anillo de score con color según valor:
// 0-20%:   color #E24B4A (Crítico)
// 21-40%:  color #E24B4A (Bajo)
// 41-60%:  color #EF9F27 (Medio)
// 61-80%:  color #EF9F27 (Alto)
// 81-100%: color #1D9E75 (Excelente)

// Botón "Nueva evaluación" arriba a la derecha
// Crea una nueva evaluación con todos los controles en estado 'pendiente'
```

### FunctionCard.js

```jsx
// Card por función con:
// Badge con nombre de función (color de la función)
// Descripción breve
// Porcentaje grande (color según nivel)
// Barra de progreso
// Fecha evaluación + usuario evaluador
// Flecha → para abrir la función
// Al hacer clic → navega a /admin/nist/{functionId}
```

### ControlesTab.js

```jsx
// Filtros: Categoría | Estado | Origen de datos | Buscador
// Tabla de controles con columnas:
// ID | Control | Estado | Progreso | Cantidad | Origen | →

// Columna Progreso: barra de progreso + porcentaje
// Columna Cantidad: "35/60 activos documentados"
// Columna Origen: ícono + nombre del módulo
// Fila clickeable → abre ControlPanel lateral

// Estados con colores:
// pendiente:    dot rojo    + badge #FCEBEB #791F1F
// parcial:      dot naranja + badge #FAEEDA #633806
// implementado: dot verde   + badge #EAF3DE #27500A
// no_aplica:    dot gris    + badge #F1EFE8 #444441
```

### ControlPanel.js — Panel lateral derecho (igual que capturas)

```jsx
// Header: código control + badge estado + X para cerrar
// Nombre del control (título grande)
// Descripción

// "Progreso del control" — porcentaje + barra de progreso
// "X/Y [módulo] documentados"

// "Origen de datos" — ícono del módulo + botón "Ver en módulo"
// Al hacer clic → navega al módulo correspondiente con filtro activo

// "Checklist de evaluación" — checkboxes editables
// Al marcar/desmarcar → actualiza automáticamente el progreso

// "Activos/Identidades/Personal asociados" (según data_source)
// Tabla mini con datos reales del cliente
// Máximo 5 filas + "Ver todos →"

// "Evidencias" — lista de archivos asociados
// Nombre + fecha + extensión
// "Ver todas →"

// "Notas DSTAC" — textarea editable

// Footer: botón "Guardar cambios" (morado)
// Al guardar → PUT /api/admin/nist/assessments/:controlId
//            → registrar en historial automáticamente
```

### EvidenciasTab.js

```jsx
// 5 stats cards arriba: Total | Aprobadas | Pendientes | Rechazadas | Cobertura NIST
// Filtros: Función | Categoría | Estado | Tipo evidencia | Buscador
// Grid de cards de evidencias (igual a capturas)

// Cada card muestra:
// Ícono según tipo (xlsx=verde, pdf=rojo, png=azul, etc.)
// Nombre del archivo
// Control asociado (código)
// Categoría
// Tipo + tamaño
// Fecha + usuario
// Badge estado
// Botones Ver y Descargar

// Panel lateral al seleccionar evidencia (EvidenciaPanel.js)
// Sección "Evidencias por control" (donut chart)
// Sección "Controles sin evidencia"
// Sección "Evidencias próximas a vencer"
```

### HistorialTab.js

```jsx
// 5 stats cards arriba: Total eventos | Cambios mes | Controles modificados |
//                       Evidencias agregadas | Usuarios activos
// Filtros: Función | Usuario | Tipo evento | Fecha | Buscador
// Botón Exportar

// Línea de tiempo de eventos (igual a capturas)
// Cada evento: fecha/hora | ícono tipo | título | control | usuario |
//              resumen del cambio | badge estado anterior→nuevo | menú acciones

// Tipos de evento con íconos y colores:
// control_actualizado:  ícono check verde
// evidencia_agregada:   ícono documento azul
// comentario_agregado:  ícono mensaje naranja
// evidencia_rechazada:  ícono X rojo
// estado_cambiado:      ícono flechas naranja
// evidencia_aprobada:   ícono check verde

// Panel lateral HistorialPanel.js al seleccionar evento
// Comparación "Antes → Después"
// Actividad por usuario
// Gráfico de evolución de madurez (mini línea de tiempo)
```

### PlanAccionTab.js

```jsx
// Tabla de tareas con columnas:
// Control | Prioridad | Estado | Responsable | Fecha límite | Acciones

// Botón "Generar plan automático" → llama a POST /api/admin/nist/plan-accion/generar
// Genera tareas para todos los controles en estado pendiente o parcial

// Prioridades con colores:
// critica: #FCEBEB #791F1F
// alta:    #FAEEDA #633806
// media:   #EEEDFE #3C3489
// baja:    #EAF3DE #27500A
```

---

## PARTE 5 — PORTAL CLIENTE (solo lectura)

```
apps/web/app/(client)/nist/
└── page.js   ← Vista de solo lectura igual que el dashboard

// El cliente ve:
// - Score general de madurez
// - 5 funciones con sus porcentajes
// - Al hacer clic en una función → ver controles (solo lectura, sin editar)
// - Pestañas: Resumen | Controles | Evidencias | Plan de acción | Historial
// SIN botones de editar, guardar ni subir evidencias
// Los controles muestran el estado actual pero no son editables
```

---

## PARTE 6 — AGREGAR AL SIDEBAR

```jsx
// Panel DSTAC: { path: '/admin/nist', icon: 'ti-chart-radar', label: 'NIST CSF' }
// Portal cliente: { path: '/client/nist', icon: 'ti-chart-radar', label: 'NIST CSF' }
```

---

## ORDEN DE CONSTRUCCIÓN

```
1. Ejecutar schema SQL en db_dstac_core
2. Crear y ejecutar apps/api/seeds/nist_seed.js con controles reales NIST CSF 2.0
3. Backend: GET /api/admin/nist/evaluacion + POST (crear evaluación)
4. Backend: GET /api/admin/nist/functions + /functions/:id
5. Backend: GET /api/admin/nist/controls + PUT /assessments/:controlId
6. Backend: recalcularScores() al guardar assessment
7. Backend: GET /api/admin/nist/stats
8. Backend: evidencias (GET, POST multipart, PUT, DELETE)
9. Backend: historial (GET)
10. Backend: plan de acción (GET, POST, PUT, POST generar)
11. Backend: datos conectados (/data/activos, /data/identidades, etc.)
12. Frontend: NistScoreRing.js (componente reutilizable)
13. Frontend: page.js vista principal con FunctionCards
14. Frontend: [functionId]/page.js con FunctionTabs
15. Frontend: ResumenTab.js
16. Frontend: ControlesTab.js + ControlPanel.js
17. Frontend: EvidenciasTab.js + EvidenciaPanel.js
18. Frontend: HistorialTab.js + HistorialPanel.js
19. Frontend: PlanAccionTab.js
20. Frontend: portal cliente /client/nist solo lectura
21. Agregar a sidebar panel DSTAC y portal cliente
22. Probar flujo completo:
    Seleccionar empresa → ver evaluación → abrir función Identificar
    → ver controles → actualizar checklist → guardar → verificar historial
    → subir evidencia → aprobar → verificar en portal cliente
```

---

## NOTAS CRÍTICAS

1. Sin TypeScript — JavaScript puro
2. Empresa activa desde localStorage 'empresa_activa', header X-Company-Slug
3. Los controles del seed son globales (db_dstac_core) — los assessments son por empresa
4. Recalcular scores SIEMPRE al guardar un assessment
5. Registrar en historial SIEMPRE al cambiar estado, subir evidencia o agregar nota
6. El ControlPanel muestra datos reales del cliente (activos, identidades, etc.)
7. "Ver en módulo" navega al módulo correspondiente con filtro activo
8. Para subir evidencias usar multer: npm install multer
9. Los archivos de evidencia se guardan en /uploads/nist/{company_slug}/
10. El portal cliente ve la misma evaluación pero sin poder editar nada
11. Diseño visual: seguir exactamente las 4 capturas adjuntas
12. Comentar el código — especialmente el cálculo de scores y el historial

