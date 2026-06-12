# PROMPT — Módulo ISO 27001:2022 Alineamiento (Panel Interno DSTAC)
# Lee CLAUDE.md antes de empezar.
# Basado en la arquitectura del PROMPT_MODULO_NIST.md pero adaptado a ISO 27001.
# Objetivo: alinear empresas cliente con ISO 27001:2022 Anexo A (93 controles).
# NO es certificación formal — es alineamiento y preparación.

---

## CONTEXTO

DSTAC ayuda a empresas chilenas a alinearse con ISO 27001:2022.
El módulo tiene 5 secciones: Resumen, Controles, Evidencias, Plan de acción, Historial.
Adicionalmente: SoA lite, Evaluación de riesgos, Generador de políticas, Indicador de brecha.
Cada empresa tiene su propia evaluación independiente.
El reporte PDF exportable se implementará en una fase posterior.

---

## PARTE 1 — SCHEMA BD (db_dstac_core)

```sql
-- Dominios ISO 27001:2022 Anexo A (4 dominios)
CREATE TABLE iso_domains (
  id          VARCHAR(5)   PRIMARY KEY,  -- A5, A6, A7, A8
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(7)   NOT NULL,
  order_num   INT          NOT NULL,
  total_controls INT       DEFAULT 0
);

-- Controles reales ISO 27001:2022 Anexo A (93 controles)
CREATE TABLE iso_controls (
  id          VARCHAR(10)  PRIMARY KEY,  -- A.5.1, A.5.2, etc.
  domain_id   VARCHAR(5)   NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  purpose     TEXT,                      -- propósito del control
  data_source VARCHAR(100),              -- activos, personal, identidades, accesos, documentos
  checklist   JSON,                      -- items de verificación
  policy_template TEXT,                  -- plantilla base de política
  order_num   INT,
  FOREIGN KEY (domain_id) REFERENCES iso_domains(id)
);

-- Evaluación ISO por empresa
CREATE TABLE iso_evaluations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  company_id    INT          NOT NULL,
  evaluator_id  INT          NOT NULL,
  status        ENUM('borrador','activa','archivada') DEFAULT 'activa',
  score_total   DECIMAL(5,2) DEFAULT 0,
  gap_total     DECIMAL(5,2) DEFAULT 0,  -- % que falta para alineamiento completo
  evaluated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)   REFERENCES companies(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

-- Assessment por control
CREATE TABLE iso_control_assessments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id   INT          NOT NULL,
  control_id      VARCHAR(10)  NOT NULL,
  applies         TINYINT(1)   DEFAULT 1,     -- SoA: ¿aplica a esta empresa?
  non_apply_reason TEXT,                       -- justificación si no aplica
  status          ENUM('pendiente','parcial','implementado','no_aplica') DEFAULT 'pendiente',
  progress        INT          DEFAULT 0,
  checklist_items JSON,
  policy_content  TEXT,                        -- política personalizada para esta empresa
  notes_dstac     TEXT,
  updated_by      INT,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
  FOREIGN KEY (updated_by)    REFERENCES users(id)
);

-- Evaluación de riesgos
CREATE TABLE iso_risks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id   INT          NOT NULL,
  company_id      INT          NOT NULL,
  asset_id        INT,                         -- FK a activos (BD operacional)
  asset_name      VARCHAR(200) NOT NULL,       -- copia del nombre por si se elimina
  threat          VARCHAR(200) NOT NULL,        -- amenaza identificada
  vulnerability   VARCHAR(200),                -- vulnerabilidad asociada
  probability     INT          NOT NULL,        -- 1-5
  impact          INT          NOT NULL,        -- 1-5
  risk_level      INT          GENERATED ALWAYS AS (probability * impact) STORED,
  risk_category   VARCHAR(20)  GENERATED ALWAYS AS (
    CASE
      WHEN (probability * impact) >= 20 THEN 'critico'
      WHEN (probability * impact) >= 12 THEN 'alto'
      WHEN (probability * impact) >= 6  THEN 'medio'
      ELSE 'bajo'
    END
  ) STORED,
  existing_controls TEXT,                      -- controles ya existentes
  residual_probability INT DEFAULT NULL,       -- después de controles
  residual_impact      INT DEFAULT NULL,
  residual_risk        INT GENERATED ALWAYS AS (
    COALESCE(residual_probability, probability) *
    COALESCE(residual_impact, impact)
  ) STORED,
  treatment       ENUM('mitigar','aceptar','transferir','evitar') DEFAULT 'mitigar',
  treatment_notes TEXT,
  control_id      VARCHAR(10),                 -- control ISO relacionado
  status          ENUM('abierto','en_tratamiento','cerrado') DEFAULT 'abierto',
  created_by      INT          NOT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id),
  FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
  FOREIGN KEY (created_by)    REFERENCES users(id)
);

-- Evidencias ISO
CREATE TABLE iso_evidences (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT          NOT NULL,
  control_id    VARCHAR(10)  NOT NULL,
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
  FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
  FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id),
  FOREIGN KEY (uploaded_by)   REFERENCES users(id),
  FOREIGN KEY (reviewed_by)   REFERENCES users(id)
);

-- Historial de cambios
CREATE TABLE iso_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT          NOT NULL,
  control_id    VARCHAR(10)  NULL,
  company_id    INT          NOT NULL,
  event_type    ENUM('control_actualizado','evidencia_agregada','evidencia_aprobada',
                     'evidencia_rechazada','comentario_agregado','estado_cambiado',
                     'riesgo_agregado','riesgo_actualizado','politica_guardada',
                     'evaluacion_creada') NOT NULL,
  user_id       INT          NOT NULL,
  previous_data JSON,
  new_data      JSON,
  comment       TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id),
  FOREIGN KEY (user_id)       REFERENCES users(id)
);

-- Plan de acción ISO
CREATE TABLE iso_action_plans (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id   INT          NOT NULL,
  control_id      VARCHAR(10)  NOT NULL,
  company_id      INT          NOT NULL,
  priority        ENUM('critica','alta','media','baja') DEFAULT 'media',
  status          ENUM('pendiente','en_progreso','completada','cancelada') DEFAULT 'pendiente',
  responsible     VARCHAR(200),
  due_date        DATE,
  action          TEXT         NOT NULL,
  evidence_needed TEXT,
  comment_dstac   TEXT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES iso_evaluations(id),
  FOREIGN KEY (control_id)    REFERENCES iso_controls(id),
  FOREIGN KEY (company_id)    REFERENCES companies(id)
);
```

---

## PARTE 2 — SEED DATA (93 controles reales ISO 27001:2022)

Crear archivo: `apps/api/seeds/iso_seed.js`

```javascript
// DOMINIOS
const DOMAINS = [
  { id: 'A5', name: 'Controles Organizacionales', color: '#534AB7',
    description: 'Controles relacionados con políticas, roles, responsabilidades y gestión organizacional',
    order_num: 1, total_controls: 37 },
  { id: 'A6', name: 'Controles de Personas', color: '#1D9E75',
    description: 'Controles relacionados con el personal y recursos humanos',
    order_num: 2, total_controls: 8 },
  { id: 'A7', name: 'Controles Físicos', color: '#EF9F27',
    description: 'Controles relacionados con seguridad física y del entorno',
    order_num: 3, total_controls: 14 },
  { id: 'A8', name: 'Controles Tecnológicos', color: '#E24B4A',
    description: 'Controles relacionados con tecnología de la información',
    order_num: 4, total_controls: 34 },
]

// CONTROLES — Cargar los 93 controles reales del Anexo A ISO 27001:2022
// Investigar y completar TODOS. Ejemplos de estructura:

// DOMINIO A.5 — Controles Organizacionales (37 controles)
const A5_CONTROLS = [
  {
    id: 'A.5.1',
    domain_id: 'A5',
    name: 'Políticas de seguridad de la información',
    description: 'La política de seguridad de la información y las políticas específicas deben ser definidas, aprobadas por la dirección, publicadas, comunicadas y reconocidas por el personal relevante y las partes interesadas.',
    purpose: 'Garantizar la dirección y el apoyo de la gestión para la seguridad de la información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de seguridad documentada y aprobada por dirección',
      'Política comunicada a todo el personal',
      'Política revisada al menos anualmente',
      'Políticas específicas por área definidas',
      'Versión vigente accesible para todos'
    ]),
    policy_template: 'Política de Seguridad de la Información\n\n[EMPRESA] se compromete a proteger la confidencialidad, integridad y disponibilidad de su información...',
    order_num: 1
  },
  {
    id: 'A.5.2',
    domain_id: 'A5',
    name: 'Roles y responsabilidades de seguridad de la información',
    description: 'Los roles y responsabilidades de seguridad de la información deben ser definidos y asignados.',
    purpose: 'Establecer responsabilidades claras para proteger la información.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Roles de seguridad definidos y documentados',
      'Responsable de seguridad designado',
      'Responsabilidades comunicadas al personal',
      'Segregación de funciones implementada donde aplica'
    ]),
    order_num: 2
  },
  // A.5.3 — Segregación de funciones
  // A.5.4 — Responsabilidades de la dirección
  // A.5.5 — Contacto con autoridades
  // A.5.6 — Contacto con grupos de interés especial
  // A.5.7 — Inteligencia de amenazas
  // A.5.8 — Seguridad de la información en gestión de proyectos
  // A.5.9 — Inventario de activos de información
  // A.5.10 — Uso aceptable de activos de información
  // A.5.11 — Devolución de activos
  // A.5.12 — Clasificación de la información
  // A.5.13 — Etiquetado de la información
  // A.5.14 — Transferencia de información
  // A.5.15 — Control de acceso
  // A.5.16 — Gestión de identidades
  // A.5.17 — Información de autenticación
  // A.5.18 — Derechos de acceso
  // A.5.19 — Seguridad de la información en relaciones con proveedores
  // A.5.20 — Abordar la seguridad en acuerdos con proveedores
  // A.5.21 — Gestión de seguridad en la cadena de suministro de TIC
  // A.5.22 — Seguimiento, revisión y gestión de cambios de servicios de proveedores
  // A.5.23 — Seguridad de la información para uso de servicios en la nube
  // A.5.24 — Planificación y preparación de la gestión de incidentes
  // A.5.25 — Evaluación y decisión sobre eventos de seguridad
  // A.5.26 — Respuesta a incidentes de seguridad
  // A.5.27 — Aprendizaje de los incidentes de seguridad
  // A.5.28 — Recolección de evidencias
  // A.5.29 — Seguridad de la información durante perturbaciones
  // A.5.30 — Preparación de las TIC para la continuidad del negocio
  // A.5.31 — Requisitos legales, estatutarios, reglamentarios y contractuales
  // A.5.32 — Derechos de propiedad intelectual
  // A.5.33 — Protección de registros
  // A.5.34 — Privacidad y protección de información personal (PII)
  // A.5.35 — Revisión independiente de la seguridad de la información
  // A.5.36 — Cumplimiento de políticas, normas y estándares
  // A.5.37 — Procedimientos de operación documentados
]

// DOMINIO A.6 — Controles de Personas (8 controles)
// A.6.1 — Selección de personal
// A.6.2 — Términos y condiciones del empleo
// A.6.3 — Concienciación, educación y formación en SI
// A.6.4 — Proceso disciplinario
// A.6.5 — Responsabilidades tras la finalización del empleo
// A.6.6 — Acuerdos de confidencialidad o no divulgación
// A.6.7 — Trabajo remoto
// A.6.8 — Reporte de eventos de seguridad de la información
// data_source: 'personal'

// DOMINIO A.7 — Controles Físicos (14 controles)
// A.7.1 — Perímetros de seguridad física
// A.7.2 — Entrada física
// A.7.3 — Seguridad de oficinas, salas e instalaciones
// A.7.4 — Monitoreo de seguridad física
// A.7.5 — Protección contra amenazas físicas y ambientales
// A.7.6 — Trabajo en áreas seguras
// A.7.7 — Escritorio y pantalla limpios
// A.7.8 — Ubicación y protección de equipos
// A.7.9 — Seguridad de activos fuera de las instalaciones
// A.7.10 — Medios de almacenamiento
// A.7.11 — Servicios de suministro
// A.7.12 — Seguridad del cableado
// A.7.13 — Mantenimiento de equipos
// A.7.14 — Eliminación segura o reutilización de equipos
// data_source: 'activos'

// DOMINIO A.8 — Controles Tecnológicos (34 controles)
// A.8.1 — Dispositivos de punto final de usuario
// A.8.2 — Derechos de acceso privilegiado
// A.8.3 — Restricción de acceso a la información
// A.8.4 — Acceso al código fuente
// A.8.5 — Autenticación segura
// A.8.6 — Gestión de la capacidad
// A.8.7 — Protección contra malware
// A.8.8 — Gestión de vulnerabilidades técnicas
// A.8.9 — Gestión de la configuración
// A.8.10 — Eliminación de información
// A.8.11 — Enmascaramiento de datos
// A.8.12 — Prevención de fuga de datos
// A.8.13 — Copia de seguridad de la información
// A.8.14 — Redundancia de instalaciones de procesamiento de información
// A.8.15 — Registro de actividades
// A.8.16 — Actividades de monitoreo
// A.8.17 — Sincronización de relojes
// A.8.18 — Uso de programas de utilidad privilegiados
// A.8.19 — Instalación de software en sistemas operativos
// A.8.20 — Seguridad en redes
// A.8.21 — Seguridad de los servicios de red
// A.8.22 — Segregación de redes
// A.8.23 — Filtrado web
// A.8.24 — Uso de criptografía
// A.8.25 — Ciclo de vida de desarrollo seguro
// A.8.26 — Requisitos de seguridad de aplicaciones
// A.8.27 — Arquitectura de sistema seguro y principios de ingeniería
// A.8.28 — Codificación segura
// A.8.29 — Pruebas de seguridad en desarrollo y aceptación
// A.8.30 — Desarrollo externalizado
// A.8.31 — Separación de entornos de desarrollo, prueba y producción
// A.8.32 — Gestión de cambios
// A.8.33 — Información de prueba
// A.8.34 — Protección de sistemas de información durante pruebas de auditoría
// data_source: 'activos,identidades,accesos'

// INSTRUCCIÓN PARA CLAUDE CODE:
// Investigar y completar la descripción, propósito, checklist y
// policy_template de CADA UNO de los 93 controles usando
// la documentación oficial ISO 27001:2022.
// No inventar controles ni descripciones.
```

---

## PARTE 3 — BACKEND

### Archivo: apps/api/routes/admin/iso.js

```javascript
// ── EVALUACIONES ──
GET  /api/admin/iso/evaluacion           → evaluación activa de la empresa
POST /api/admin/iso/evaluacion           → crear nueva evaluación

// ── DOMINIOS Y CONTROLES ──
GET  /api/admin/iso/domains              → 4 dominios con scores
GET  /api/admin/iso/controls             → controles con filtros
GET  /api/admin/iso/controls/:id         → detalle con assessment

// ── ASSESSMENTS ──
PUT  /api/admin/iso/assessments/:controlId → actualizar estado, progreso, checklist

// ── SOA (Declaración de Aplicabilidad simplificada) ──
GET  /api/admin/iso/soa                  → tabla completa de aplicabilidad
PUT  /api/admin/iso/soa/:controlId       → marcar aplica/no aplica con justificación

// ── EVALUACIÓN DE RIESGOS ──
GET  /api/admin/iso/riesgos              → listar riesgos con filtros
POST /api/admin/iso/riesgos              → crear riesgo
PUT  /api/admin/iso/riesgos/:id          → actualizar riesgo
DELETE /api/admin/iso/riesgos/:id        → eliminar riesgo
GET  /api/admin/iso/riesgos/stats        → stats (total, por categoría, por tratamiento)

// ── POLÍTICAS ──
GET  /api/admin/iso/politicas            → listar políticas por control
PUT  /api/admin/iso/politicas/:controlId → guardar política personalizada

// ── EVIDENCIAS ──
GET    /api/admin/iso/evidencias
POST   /api/admin/iso/evidencias         → multipart/form-data
PUT    /api/admin/iso/evidencias/:id     → aprobar/rechazar
DELETE /api/admin/iso/evidencias/:id

// ── HISTORIAL ──
GET  /api/admin/iso/historial

// ── PLAN DE ACCIÓN ──
GET  /api/admin/iso/plan-accion
POST /api/admin/iso/plan-accion
PUT  /api/admin/iso/plan-accion/:id
POST /api/admin/iso/plan-accion/generar

// ── STATS E INDICADOR DE BRECHA ──
GET  /api/admin/iso/stats
// Respuesta:
{
  score_total:      N,   // % cumplimiento general
  gap_total:        N,   // % que falta
  por_dominio: [
    { domain_id, name, score, controls_total, controls_done, controls_partial }
  ],
  implementados:    N,
  parciales:        N,
  pendientes:       N,
  no_aplica:        N,
  sin_evidencia:    N,   // implementados pero sin evidencia
}

// ── DATOS CONECTADOS (BD operacional del cliente) ──
GET  /api/admin/iso/data/activos
GET  /api/admin/iso/data/identidades
GET  /api/admin/iso/data/accesos
GET  /api/admin/iso/data/personal
```

### Cálculo de scores

```javascript
// Score de un dominio = promedio progress de controles que aplican (applies=1)
// Score general = promedio de los 4 dominios
// Gap = 100 - score_general

async function recalcularScores(evaluationId) {
  const [domains] = await centralDB.execute('SELECT id FROM iso_domains')
  let totalScore = 0

  for (const domain of domains) {
    const [result] = await centralDB.execute(`
      SELECT AVG(ica.progress) AS avg_progress
      FROM iso_control_assessments ica
      JOIN iso_controls ic ON ica.control_id = ic.id
      WHERE ica.evaluation_id = ?
        AND ic.domain_id = ?
        AND ica.applies = 1
        AND ica.status != 'no_aplica'
    `, [evaluationId, domain.id])
    totalScore += result[0].avg_progress ?? 0
  }

  const scoreTotal = totalScore / domains.length
  await centralDB.execute(
    'UPDATE iso_evaluations SET score_total = ?, gap_total = ? WHERE id = ?',
    [scoreTotal, 100 - scoreTotal, evaluationId]
  )
}
```

---

## PARTE 4 — FRONTEND

### Estructura de archivos

```
apps/web/app/(admin)/iso/
├── page.js                          ← Vista principal
├── [domainId]/
│   └── page.js                      ← Vista de dominio con pestañas
└── components/
    ├── IsoOverview.js               ← Indicador de brecha + cards dominios
    ├── DomainCard.js                ← Card de cada dominio
    ├── GapIndicator.js              ← Indicador visual "X% alineado, Y% falta"
    ├── DomainTabs.js                ← Pestañas
    ├── tabs/
    │   ├── ResumenTab.js
    │   ├── ControlesTab.js
    │   ├── EvidenciasTab.js
    │   ├── RiesgosTab.js            ← NUEVO vs NIST
    │   ├── PoliticasTab.js          ← NUEVO vs NIST
    │   ├── SoaTab.js                ← NUEVO vs NIST
    │   ├── PlanAccionTab.js
    │   └── HistorialTab.js
    └── panels/
        ├── ControlPanel.js
        ├── EvidenciaPanel.js
        ├── RiesgoPanel.js           ← NUEVO
        ├── PoliticaPanel.js         ← NUEVO
        └── HistorialPanel.js
```

### GapIndicator.js — Indicador de brecha (diferenciador visual)

```jsx
// Mostrar prominentemente en la vista principal:
// "Tu empresa está alineada al X% con ISO 27001:2022"
// Barra de progreso grande con gradiente
// "Te faltan Y controles para completar el alineamiento"
// Desglose por dominio

// Colores según nivel:
// 0-25%:  rojo    "Alineamiento crítico"
// 26-50%: naranja "Alineamiento bajo"
// 51-75%: amarillo "Alineamiento medio"
// 76-90%: azul    "Alineamiento alto"
// 91-100%: verde  "Completamente alineado"
```

### SoaTab.js — Declaración de Aplicabilidad simplificada

```jsx
// Tabla con todos los 93 controles
// Columnas: Control | Nombre | ¿Aplica? | Justificación | Estado
// Toggle aplica/no aplica por fila
// Si no aplica → campo de justificación obligatorio
// Resumen arriba: "X controles aplican / Y no aplican"
// Exportar SoA (solo estructura, sin lógica PDF por ahora)
```

### RiesgosTab.js — Evaluación de riesgos

```jsx
// Stats arriba: Total riesgos | Críticos | Altos | Medios | Bajos
// Matriz de riesgo visual (5x5) con puntos representando cada riesgo
// Tabla de riesgos con filtros
// Columnas: Activo | Amenaza | Probabilidad | Impacto | Nivel | Riesgo residual | Tratamiento

// Al crear riesgo:
// Select de activo (carga desde BD operacional del cliente)
// Amenaza (input texto)
// Vulnerabilidad (input texto)
// Probabilidad 1-5 (slider o select)
// Impacto 1-5 (slider o select)
// Nivel de riesgo calculado automáticamente (probabilidad × impacto)
// Controles existentes (textarea)
// Riesgo residual (probabilidad y impacto después de controles)
// Tratamiento: mitigar/aceptar/transferir/evitar
// Control ISO relacionado (select)

// Colores de nivel de riesgo:
// 20-25: Crítico #E24B4A
// 12-19: Alto    #EF9F27
// 6-11:  Medio   #EF9F27 (más claro)
// 1-5:   Bajo    #1D9E75
```

### PoliticasTab.js — Generador de políticas

```jsx
// Lista de controles que tienen policy_template definido
// Para cada uno: botón "Generar política"
// Al hacer clic → abre editor con la plantilla pre-cargada
// El analista personaliza el texto para esa empresa
// Guarda con PUT /api/admin/iso/politicas/:controlId
// Estado: Sin política | Borrador | Lista
// Badge verde cuando está lista
```

---

## PARTE 5 — PORTAL CLIENTE (solo lectura)

```
apps/web/app/(client)/iso/
└── page.js

// El cliente ve:
// - Indicador de brecha prominente "X% alineado con ISO 27001"
// - 4 dominios con porcentajes
// - Al hacer clic → ver controles de ese dominio (solo lectura)
// - Pestañas: Resumen | Controles | Evidencias | Plan de acción | Historial
// SIN RiesgosTab (datos internos de DSTAC)
// SIN PoliticasTab (gestión interna de DSTAC)
// SIN SoaTab (gestión interna de DSTAC)
// Solo ve el resultado: qué controles están implementados y qué falta
```

---

## AGREGAR AL SIDEBAR

```jsx
// Panel DSTAC: { path: '/admin/iso', icon: 'ti-certificate', label: 'ISO 27001' }
// Portal cliente: { path: '/client/iso', icon: 'ti-certificate', label: 'ISO 27001' }
```

---

## ORDEN DE CONSTRUCCIÓN

```
1.  Schema SQL en db_dstac_core
2.  apps/api/seeds/iso_seed.js — investigar y cargar 93 controles reales
3.  Backend: evaluación (GET + POST)
4.  Backend: dominios y controles (GET)
5.  Backend: assessments (PUT + recalcularScores)
6.  Backend: stats e indicador de brecha
7.  Backend: SoA (GET + PUT)
8.  Backend: riesgos (CRUD completo)
9.  Backend: políticas (GET + PUT)
10. Backend: evidencias (multipart)
11. Backend: historial y plan de acción
12. Backend: datos conectados (/data/activos, etc.)
13. Frontend: GapIndicator.js
14. Frontend: page.js vista principal con DomainCards
15. Frontend: [domainId]/page.js con DomainTabs
16. Frontend: ResumenTab + ControlesTab + ControlPanel
17. Frontend: SoaTab
18. Frontend: RiesgosTab + RiesgoPanel (con matriz visual)
19. Frontend: PoliticasTab + PoliticaPanel
20. Frontend: EvidenciasTab + EvidenciaPanel
21. Frontend: PlanAccionTab + HistorialTab
22. Frontend: portal cliente /client/iso
23. Agregar a sidebar panel DSTAC y portal cliente
24. Probar flujo completo end-to-end
```

---

## NOTAS CRÍTICAS

1. Sin TypeScript — JavaScript puro
2. Empresa activa desde localStorage, header X-Company-Slug
3. Los 93 controles son globales (db_dstac_core) — assessments son por empresa
4. Recalcular scores SIEMPRE al guardar assessment
5. Registrar en historial SIEMPRE al cambiar estado, subir evidencia o guardar política
6. La matriz de riesgo es visual — usar SVG o CSS grid 5x5
7. Las políticas son texto editable — no generan PDF todavía
8. El portal cliente NO ve riesgos, políticas ni SoA
9. Instalar multer para evidencias: npm install multer
10. Archivos en /uploads/iso/{company_slug}/
11. Diseño visual igual a las capturas del módulo NIST — misma estructura
12. Comentar código — especialmente cálculo de scores y matriz de riesgo

