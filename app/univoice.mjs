// app/univoice.mjs
// UniVoice DApp CLI — Dibuat oleh Anggota 2
// Memanggil smart contract UniVoice di Anvil lokal

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════
//  KONFIGURASI — GANTI CONTRACT_ADDRESS DI BAWAH!
// ═══════════════════════════════════════════════
const RPC_URL          = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // <-- GANTI DENGAN ALAMAT DARI LANGKAH 7!

// Private key akun Anvil (sudah bawaan, jangan diubah)
const PK_ADMIN     = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Akun #0 (Admin/BEM)
const PK_MAHASISWA = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Akun #1 (Mahasiswa)
const PK_MAHASISWA2= "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // Akun #2 (Mahasiswa)

// ═══════════════════════════════════════════════
//  SETUP KONEKSI
// ═══════════════════════════════════════════════
const provider = new ethers.JsonRpcProvider(RPC_URL);

const adminWallet  = new ethers.Wallet(PK_ADMIN, provider);
const mhs1Wallet   = new ethers.Wallet(PK_MAHASISWA, provider);
const mhs2Wallet   = new ethers.Wallet(PK_MAHASISWA2, provider);

// Baca ABI dari hasil compile Foundry
const artifactPath = join(__dirname, "..", "out", "UniVoice.sol", "UniVoice.json");
const artifact     = JSON.parse(readFileSync(artifactPath, "utf-8"));
const ABI          = artifact.abi;

const contractAdmin = new ethers.Contract(CONTRACT_ADDRESS, ABI, adminWallet);
const contractMhs1  = new ethers.Contract(CONTRACT_ADDRESS, ABI, mhs1Wallet);
const contractMhs2  = new ethers.Contract(CONTRACT_ADDRESS, ABI, mhs2Wallet);

const STATUS_LABEL = ["Diajukan", "Diproses", "Selesai"];

// ═══════════════════════════════════════════════
//  FUNGSI BANTUAN
// ═══════════════════════════════════════════════
async function tampilkanAspirasi(id) {
    const a = await contractAdmin.getAspirasi(id);
    console.log(`\n  📌 Aspirasi #${a.id}`);
    console.log(`     Kategori  : ${a.kategori}`);
    console.log(`     Deskripsi : ${a.deskripsi}`);
    console.log(`     Status    : ${STATUS_LABEL[Number(a.status)]}`);
    console.log(`     Dukungan  : ${a.jumlahDukungan} 👍`);
    console.log(`     Pengirim  : ${a.pengirim}`);
    console.log(`     Waktu     : ${new Date(Number(a.timestamp) * 1000).toLocaleString()}`);
}

// ═══════════════════════════════════════════════
//  PROGRAM UTAMA
// ═══════════════════════════════════════════════
async function main() {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║       🎓  UniVoice DApp — Demo CLI           ║");
    console.log("║       Dibuat oleh: [Otniel, Mukti]           ║");
    console.log("╚══════════════════════════════════════════════╝\n");

    // ── WRITE 1: Kirim Aspirasi ──
    console.log("📝 [WRITE 1] Mahasiswa 1 mengirim aspirasi...");
    let tx1 = await contractMhs1.kirimAspirasi(
        "Fasilitas",
        "AC lantai 3 gedung FTI tidak berfungsi sejak minggu lalu"
    );
    let r1 = await tx1.wait();
    console.log(`   ✅ TX Hash : ${r1.hash}`);
    console.log(`   ⛽ Gas Used: ${r1.gasUsed.toString()}`);

    // ── WRITE 2: Kirim Aspirasi Kedua ──
    console.log("\n📝 [WRITE 2] Mahasiswa 2 mengirim aspirasi...");
    let tx2 = await contractMhs2.kirimAspirasi(
        "Akademik",
        "Jadwal mata kuliah Blockchain bentrok dengan KKN"
    );
    let r2 = await tx2.wait();
    console.log(`   ✅ TX Hash : ${r2.hash}`);
    console.log(`   ⛽ Gas Used: ${r2.gasUsed.toString()}`);

    // ── WRITE 3: Dukung Aspirasi ──
    console.log("\n👍 [WRITE 3] Mahasiswa 2 mendukung aspirasi #1...");
    let tx3 = await contractMhs2.dukungAspirasi(1, { nonce: 1 });
    let r3 = await tx3.wait();
    console.log(`   ✅ TX Hash : ${r3.hash}`);
    console.log(`   ⛽ Gas Used: ${r3.gasUsed.toString()}`);

    // ── WRITE 4: Admin Ubah Status ──
    console.log("\n🔧 [WRITE 4] Admin mengubah status aspirasi #1 → Diproses...");
    let tx4 = await contractAdmin.ubahStatus(1, 1);
    let r4 = await tx4.wait();
    console.log(`   ✅ TX Hash : ${r4.hash}`);
    console.log(`   ⛽ Gas Used: ${r4.gasUsed.toString()}`);

    // ── READ: Tampilkan Semua Aspirasi ──
    console.log("\n📖 [READ] Menampilkan semua aspirasi...");
    const total = await contractAdmin.getJumlahAspirasi();
    console.log(`   Total aspirasi: ${total}`);
    for (let i = 1; i <= Number(total); i++) {
        await tampilkanAspirasi(i);
    }

    // ── SECURITY TEST ──
    console.log("\n🔒 [SECURITY] Non-admin mencoba ubah status (harus gagal)...");
    try {
        await contractMhs1.ubahStatus(1, 2);
        console.log("   ⚠️ Seharusnya gagal!");
    } catch (err) {
        console.log(`   ❌ Ditolak: hanya admin yang berwenang`);
    }

    console.log("\n✅ Demo UniVoice selesai!\n");
}

main().catch(console.error);
