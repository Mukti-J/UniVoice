# 🎓 UniVoice DApp
Aplikasi Kotak Aspirasi Transparan Berbasis Blockchain Ethereum (Lokal). Tugas Rancang (TR) Teknologi Blockchain.

## 📌 Informasi Jaringan & Kontrak
- **RPC Endpoint** : `http://127.0.0.1:8545` (Anvil Local Node)
- **Chain ID**     : `31337`
- **Alamat Kontrak**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **TX Hash Deploy**: `0x6fcaa0c858a68e146633600c9fa3619e69399ed85acdebb59a1de40d57bb6226`

## ⚙️ Prasyarat (Prerequisites)
Pastikan sistem Anda telah terpasang perangkat lunak berikut:
- WSL2 Ubuntu 24.04
- Foundry (`forge`, `anvil`, `cast`)
- Node.js & `npm`

---

## 🚀 Panduan Setup & Menjalankan Aplikasi

**1. Clone Repository & Masuk ke Folder**
```
git clone https://github.com/Mukti-J/UniVoice.git
cd UniVoice
```

**2. Build & Test Smart Contract**
``` 
forge build
forge test -vv
```

**3. Jalankan Node Lokal (Buka Terminal Baru)**
```
anvil
```

**4. Deploy Kontrak (Kembali ke Terminal Proyek)**
``` 
export PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

forge create src/UniVoice.sol:UniVoice --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) --private-key $PK --broadcast --constructor-args$ADMIN
```

**5. Jalankan DApp CLI (Interaksi Aplikasi)**
```
cd app
npm install
node univoice.mjs
```
