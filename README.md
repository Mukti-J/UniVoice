# 🎓 UniVoice DApp

Aplikasi Kotak Aspirasi Transparan Berbasis Blockchain Ethereum (Lokal).
Tugas Rancang (TR) Teknologi Blockchain — TC789A.

## 📌 Informasi Jaringan & Kontrak

- RPC Endpoint  : `http://127.0.0.1:8545` (Anvil Local Node)
- Chain ID      : `31337`
- Alamat Kontrak: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- TX Hash Deploy: `0x6fcaa0c858a68e146633600c9fa3619e69399ed85acdebb59a1de40d57bb6226`
- Admin / BEM   : `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (akun Anvil #0)

## ⚙️ Prasyarat (Prerequisites)

- WSL2 Ubuntu 24.04
- Foundry (`forge`, `anvil`, `cast`)
- Browser dengan ekstensi **MetaMask**
- Python 3 (untuk web server lokal) *atau* ekstensi VS Code **Live Server**

## 🚀 Panduan Setup & Menjalankan Aplikasi

### 1. Clone Repository & Masuk ke Folder
```
git clone https://github.com/Mukti-J/UniVoice.git
cd UniVoice
```

### 2. Build & Test Smart Contract**
``` 
forge build
forge test -vv
```
### 3. Jalankan Node Lokal (Buka Terminal Baru)**
```
anvil
```
### 4. Deploy Kontrak (Kembali ke Terminal Proyek)**
```
export PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

forge create src/UniVoice.sol:UniVoice --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast --constructor-args $ADMIN
```

### 5. Setup MetaMask (sekali, agar simulasi multi-akun jalan)
    1. Tambah jaringan: Anvil Local → RPC http://127.0.0.1:8545, Chain ID 31337, Symbol ETH.
    2. Import account (Private Key) untuk 4 akun Anvil dari output anvil:
        - #0 Admin/BEM, #1 Mahasiswa 1, #2 Mahasiswa 2, #3 Mahasiswa 3.
        - (Akun Anvil sudah berisi 10.000 ETH → gas bukan masalah.)

### 6. Jalankan Web App (Terminal Baru — biarkan menyala)
```
cd app
python3 -m http.server 8080      # lalu buka http://localhost:8080
```
Tempel alamat kontrak → 🦊 Hubungkan MetaMask → pilih akun. Ganti peran cukup switch akun di MetaMask (Web App otomatis menyesuaikan: 👑 Admin / 🎓 Mahasiswa).
## 🔑 Catatan Penting
- Netralitas admin: akun Admin/BEM tidak dapat mengirim aspirasi maupun vote (form terkunci) — admin hanya memproses & memoderasi, demi netralitas sebagai penengah.
- Soft-delete: moderasi spam dilakukan dengan menolak aspirasi + catatan alasan (data tetap ada di chain, hanya disembunyikan di UI; aktifkan toggle transparansi untuk melihatnya).
- Jika anvil di-restart, state hilang → deploy ulang (langkah 4) dan tempel alamat baru ke Web App.