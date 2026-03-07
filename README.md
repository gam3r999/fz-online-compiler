<div align="center">

```
███████╗███████╗     ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗██╗     ███████╗██████╗
██╔════╝╚══███╔╝    ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║██║     ██╔════╝██╔══██╗
█████╗    ███╔╝     ██║     ██║   ██║██╔████╔██║██████╔╝██║██║     █████╗  ██████╔╝
██╔══╝   ███╔╝      ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║██║     ██╔══╝  ██╔══██╗
██║     ███████╗    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║███████╗███████╗██║  ██║
╚═╝     ╚══════╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
```

### 🐬 The **only** free online compiler for Flipper Zero apps that actually works.

Upload your `.c` and `.fam` files. Get a real `.fap` back. No install. No BS.

[![Compile Now](https://img.shields.io/badge/▶%20COMPILE%20NOW-00e5ff?style=for-the-badge&logoColor=black)](https://your-site.com)
[![Free Forever](https://img.shields.io/badge/FREE%20FOREVER-b4ff3c?style=for-the-badge&logoColor=black)](https://your-site.com)
[![No Account](https://img.shields.io/badge/NO%20ACCOUNT%20NEEDED-ff3c6e?style=for-the-badge&logoColor=white)](https://your-site.com)

---

*Built because every other online Flipper compiler was broken or dead.*
*I got sick of it.* 💪

</div>

---

## ◈ Features

| | |
|---|---|
| ⚡ | **Real compilation** via `ufbt` — not simulated, not fake |
| 🔧 | **4 firmware targets** — Official, Unleashed, RogueMaster, Momentum |
| 🆓 | **Completely free** — no paywalls, no limits |
| 👤 | **No account** — just upload and compile |
| 🌐 | **Browser-based** — works anywhere, on any machine |

---

## ◈ How To Use

```
STEP 1 ──▶  Visit the website
STEP 2 ──▶  Upload your .c source file
STEP 3 ──▶  Upload your .fam manifest file
STEP 4 ──▶  Select your target firmware
STEP 5 ──▶  Hit [ Compile to FAP ]
STEP 6 ──▶  Download .fap → copy to your Flipper
```

> [!WARNING]
> First compile may take **~60 seconds** to wake the server. After that — it's fast.

---

## ◈ Example `.fam` File

```python
App(
    appid          = "my_app",
    name           = "My App",
    apptype        = FlipperAppType.EXTERNAL,
    entry_point    = "my_app_main",       # ← must match your C function name exactly
    requires       = ["gui"],
    stack_size     = 2 * 1024,
    fap_category   = "Misc",
    fap_description= "My cool app",
    fap_author     = "YourName",
    fap_version    = "1.0",
)
```

> [!IMPORTANT]
> `entry_point` must match your function name in your `.c` file **exactly** — case sensitive.

---

## ◈ Supported Firmware

```
┌─────────────────┬──────────────────────────────────────────┐
│   FIRMWARE      │   DESCRIPTION                            │
├─────────────────┼──────────────────────────────────────────┤
│  Official       │  Stock Flipper Zero firmware             │
│  Unleashed      │  DarkFlippers Unleashed firmware         │
│  RogueMaster    │  RogueMaster community firmware          │
│  Momentum       │  Momentum firmware                       │
└─────────────────┴──────────────────────────────────────────┘
```

---

## ◈ Architecture

```
  [ YOUR BROWSER ]
        │
        │  .c + .fam files
        ▼
  ┌─────────────────────┐
  │   React + TypeScript │  ◀── hosted on Vercel
  │      Frontend        │
  └──────────┬──────────┘
             │  compile request
             ▼
  ┌─────────────────────┐
  │  Python + Flask      │  ◀── hosted on Render
  │  + ufbt backend      │
  └──────────┬──────────┘
             │
             ▼
         .fap file
    (no database, direct return)
```

---

## ◈ Self Hosting

<details>
<summary><b>▶ Frontend</b></summary>

```bash
git clone https://github.com/yourusername/fz-online-compiler
cd fz-online-compiler
npm install
npm run dev
```

Add a `.env` file:

```env
VITE_COMPILE_SERVER_URL=https://your-compile-server.onrender.com
```

</details>

<details>
<summary><b>▶ Compile Server</b></summary>

```bash
git clone https://github.com/yourusername/flipper-compile-server
cd flipper-compile-server
pip install -r requirements.txt
python server.py
```

Or deploy to Render / Railway using the included `Dockerfile`.

</details>

---

## ◈ Support

```
  ⭐  Star the repo if this saved you time — it means a lot.
  🐛  Found a bug? Open an issue and I'll fix it.
```

[![Star on GitHub](https://img.shields.io/github/stars/yourusername/fz-online-compiler?style=for-the-badge&color=00e5ff)](https://github.com/gam3r999/fz-online-compiler/)
[![Open Issues](https://img.shields.io/github/issues/yourusername/fz-online-compiler?style=for-the-badge&color=ff3c6e)](https://github.com/gam3r999/fz-online-compiler/issues)

---

<div align="center">

**© 2026 FZ Compiler. All Rights Reserved.**

*Unauthorized redistribution or resale of this service is prohibited.*

</div>
