# OEE FRO (Factory Real-time Operations) Dashboard

> **Interactive Frontend Prototype** untuk sistem monitoring Overall Equipment Effectiveness (OEE) multi-pabrik dan analisis kerugian produksi (*Loss Analysis*).

---

## 🎯 Target Pengguna & Persona

1. **Shift Leader**  
   Fokus pada operasional *real-time* per shift di zona yang ditugaskan:
   - Pemantauan status mesin (*Running, Slow, Down, Idle*)
   - Peta lantai produksi isometrik interaktif (zoom & pan)
   - Indikator sensor dan alarm aktif

2. **Section Head**  
   Fokus pada evaluasi lintas zona dan analisis performa periodik:
   - Agregasi performa multi-plant (Group Site & Plant View)
   - Analisis *OEE Waterfall* & hierarki *Loss Tree*
   - Analisis akar masalah (*Root Cause Pareto Analysis*)
   - Perbandingan *Shift Performance*

---

## ✨ Fitur Utama

- **Control Tower Full-Screen Layout**: Tampilan tanpa batas margin sempit, optimal untuk TV display di control room pabrik maupun desktop workstation.
- **Multi-Level Drill-Down**: Navigasi hierarkis lengkap:  
  `Multi Plant` ➔ `Plant View` ➔ `Zone View` ➔ `Line Detail` ➔ `Machine Detail`.
- **Interactive Isometric Floor Map**: Visualisasi denah pabrik bergaya 3D berbasis proyeksi murni **Isometric SVG** yang sangat ringan (responsif, mendukung mouse-wheel zoom & drag-to-pan tanpa beban GPU 3D).
- **OEE Waterfall & Loss Tree**: Sinkronisasi alur waktu operasi (*Calendar Time* hingga *Effective Time*) serta pengelompokan breakdown kerugian operasional.
- **Cascading Filter & Quick Switcher**: Filter dinamis (Plant, Zone, Line, SKU, rentang tanggal) serta penggantian role & dark/light mode secara instan via sidebar.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TanStack Start / Router](https://tanstack.com/router)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/) & Lucide React Icons
- **Visualisasi Peta**: Pure SVG Mathematical Isometric Projection
