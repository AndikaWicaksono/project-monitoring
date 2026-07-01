# PRIME — Project Intelligence and Monitoring Engine

Platform manajemen internal untuk **PGN COM** yang mengintegrasikan Board Management (eksekusi pekerjaan lintas divisi) dan Monitoring (SLA, laporan, biaya, dan dokumen serah terima kontrak).

Dibangun sepenuhnya di frontend — tanpa backend atau database eksternal. Data dipersist via localStorage.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`.

```bash
npm run build    # Production build
npm run preview  # Preview build hasil
npm run lint     # Lint check
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (custom design tokens) |
| State | Zustand + persist middleware (localStorage) |
| Animasi | Framer Motion |
| Grafik | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Icons | Lucide React |
| Notifikasi | React Hot Toast |

## Modul

### Board Management

- **Board Utama (L0)** — Pipeline project lintas divisi dengan 5 stage bisnis: *Lead to Active → Plan to Build → Build to Operate → Operate to Assure → Close*. Bobot per stage (total 100%) untuk kalkulasi progres.
- **Board Divisi (Kanban)** — Eksekusi task dengan drag & drop, handoff antar divisi (dengan approval), delete request, segment change request.
- **Dashboard Analytics** — Burndown chart, approval queue, top overdue tasks, activity log real-time.

### Monitoring

| Sub-modul | Fungsi |
|---|---|
| **Dashboard Monitoring** | Executive summary: SLA trend, cost overview, report status distribution, warning panel per role |
| **Master Data** | Setup project baru (otomatis sync ke Report + SLA), assign Doccon, edit, hapus |
| **SLA Monitoring** | Pencapaian SLA bulanan per komponen per kontrak vs target (%) |
| **Report Project** | Workflow dokumen laporan: Engineer → Doccon → Kadiv → Customer → Sales. Filter client, PIC, bottleneck analytics |
| **Cost Monitoring** | Anggaran vs realisasi per bulan, per item biaya, per satuan kerja (OSM/DMO/SCS) |
| **BAP Monitoring** | Tracking dokumen serah terima (BAP/BAPP/BAST) dengan checklist 7 langkah |
| **Sales Inbox** | Penerimaan dokumen dari Doccon — accept atau flag issue |

## Role & Akses

| Role | Board | SLA | Report | Cost | BAP | Master Data | Sales Inbox |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Kadiv | ✓ | ✓ | ✓ | R | ✓ | ✓ | — |
| Kadep SAR | — | R | R | R | R | ✓ | — |
| Admin OSM | — | ✓ | ✓ | OSM | ✓ | — | — |
| Admin DMO | — | — | — | DMO | — | — | — |
| Admin SCS | — | — | — | SCS | — | — | — |
| Doccon OSM | — | own | own | — | ✓ | — | — |
| Engineer OS | — | R | submit | — | — | — | — |
| Sales | — | — | — | — | — | — | ✓ |

> `R` = read-only · `own` = hanya project yang di-assign ke user tersebut

## Akun Demo

| Email | Password | Role |
|---|---|---|
| admin@pertamina.id | admin123 | Super Admin |
| admin.osm@pertamina.id | osm123 | Admin OSM |
| admin.dmo@pertamina.id | dmo123 | Admin DMO |
| admin.scs@pertamina.id | scs123 | Admin SCS |
| kadep@pertamina.id | kadep123 | Kadep SAR |
| doccon.osm@pertamina.id | osm123 | Doccon — Resyah |
| engineer.os@pertamina.id | eos123 | Engineer OS |

## Struktur Folder

```
src/
├── components/
│   ├── layout/           Sidebar, Header, AppShell
│   ├── board/            KanbanBoard, KanbanColumn, TaskCard
│   ├── monitoring/       Modal-modal modul monitoring
│   │   └── dashboard/    Chart & widget Dashboard Monitoring
│   ├── modals/           Modal Board Management
│   └── ui/               Button, Input, Modal, Badge, Tooltip, dll
├── hooks/                usePermissions, useMonitoringRole, dll
├── pages/
│   ├── monitoring/       MonitoringDashboard, SLA, Report, Cost, BAP, Assignment
│   ├── BoardPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProjectBoardPage.tsx
│   ├── SalesInboxPage.tsx
│   └── LoginPage.tsx
├── store/                Zustand stores (task, team, auth, monitoring, log, dll)
├── types/                Domain types (monitoring.ts, index.ts)
└── utils/                colors, helpers
```

## Catatan

- Seluruh UI dalam **Bahasa Indonesia**.
- Data persist otomatis ke `localStorage`. Reset: buka DevTools → Application → Storage → Clear Site Data.
- Tidak ada koneksi ke server — cocok untuk demo dan prototyping.
