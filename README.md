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

---

## 📊 OEE Analytics — Factory Floor Map (update)

Halaman **OEE Analytics** (`/analytics`) dirombak untuk Section Head dan Shift Leader:

- **Filter**: Plant, Zone (per zona atau semua zona), dan horizon waktu *Current Shift · This Week · This Month · This Year*. Pilihan filter tersimpan saat berpindah halaman.
- **Live Issue Log** (Current Shift: mesin yang sedang stop, jam mulai & durasi) atau **Issue Log** (horizon lain: total downtime & jumlah stop).
- **Performance Issues**: line yang running di bawah kecepatan standar (ppm aktual vs standar).
- **Factory Floor Map**: setiap line menampilkan OEE, PPM, Output, status, dan rantai mesin (OEE/PPM/Output per mesin).
- **Klik line → Line Performance** (`/analytics/line/$plantId/$zoneId/$lineId?h=<horizon>`): KPI strip, Line Condition, rantai mesin, Active Alarms/Top Stops, tren OEE (tooltip A/P/Q), Output vs plan (kumulatif, reset saat ganti PO), Line speed, serta tab per mesin dengan ilustrasi, MTTR/MTBF, donut OEE, A/P/Q, dan Machine Informations.

Data horizon diturunkan secara deterministik dari mock data shift (`src/lib/oee/horizon.ts`).
