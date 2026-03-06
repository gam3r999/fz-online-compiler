# 🐬 The Ultimate FZ Compiler

The **only** free online compiler for Flipper Zero apps that actually works. Upload your `.c` and `.fam` files and get a real `.fap` file back — no installation needed.

> Built because every other online Flipper compiler was either broken or taken down. I got sick of it. 💪

---

## ✨ Features

- ✅ Real compilation using `ufbt` — not fake
- ✅ Supports **4 firmware types** — Official, Unleashed, RogueMaster, Momentum
- ✅ Completely free
- ✅ No account needed
- ✅ Works in your browser

---

## 🚀 How To Use

1. Go to the website
2. Upload your `.c` source file
3. Upload your `.fam` manifest file
4. Pick your firmware
5. Hit **Compile to FAP**
6. Download your `.fap` and copy it to your Flipper!

> ⚠️ First compile may take ~60 seconds to wake up the server. After that it's fast!

---

## 📄 Example .fam File

```python
App(
    appid="my_app",
    name="My App",
    apptype=FlipperAppType.EXTERNAL,
    entry_point="my_app_main",
    requires=["gui"],
    stack_size=2 * 1024,
    fap_category="Misc",
    fap_description="My cool app",
    fap_author="YourName",
    fap_version="1.0",
)
```

> Make sure `entry_point` matches your function name in your `.c` file exactly!

---

## 🔧 Supported Firmware

| Firmware | Description |
|----------|-------------|
| Official | Stock Flipper Zero firmware |
| Unleashed | DarkFlippers Unleashed firmware |
| RogueMaster | RogueMaster firmware |
| Momentum | Momentum firmware |

---

## 🛠️ How It Works

- **Frontend** — React + TypeScript hosted on Vercel
- **Compile Server** — Python + Flask + ufbt hosted on Render
- **No database** — files are compiled and returned directly

---

## 🧑‍💻 Self Hosting

### Frontend
```bash
git clone https://github.com/yourusername/fz-online-compiler
cd fz-online-compiler
npm install
npm run dev
```

Add a `.env` file:
```
VITE_COMPILE_SERVER_URL=https://your-compile-server.onrender.com
```

### Compile Server
```bash
git clone https://github.com/yourusername/flipper-compile-server
cd flipper-compile-server
pip install -r requirements.txt
python server.py
```

Or deploy to Render/Railway using the included `Dockerfile`.

---

## ⭐ Support

If this helped you, drop a star on the repo! It means a lot 🙏

Found a bug? Open an issue and I'll fix it.
