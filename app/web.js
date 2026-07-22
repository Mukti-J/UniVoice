// app/web.js  —  UniVoice Frontend (versi robust: auto-reconnect + multi-akun mulus)
const RPC_URL  = "http://127.0.0.1:8545";
const CHAIN_ID = 31337;

const STATUS_LABEL = ["Diajukan", "Diproses", "Selesai", "Ditolak"];
const STATUS_CLASS = ["status-0", "status-1", "status-2", "status-3"];
const STATUS_ICON  = ["📋", "⚙️", "✅", "🚫"];

const ABI = [
  "function kirimAspirasi(string _kategori, string _deskripsi)",
  "function dukungAspirasi(uint256 _id)",
  "function batalkanDukungan(uint256 _id)",
  "function ubahStatus(uint256 _id, uint8 _statusBaru)",
  "function tolakAspirasi(uint256 _id, string _catatan)",
  "function updateCatatanAdmin(uint256 _id, string _catatan)",
  "function getAllAspirasi() view returns (tuple(uint256 id, string kategori, string deskripsi, uint8 status, uint256 jumlahDukungan, address pengirim, uint256 waktuDibuat, string catatanAdmin, bool sudahDukung)[])",
  "function getAspirasi(uint256 _id) view returns (tuple(uint256 id, string kategori, string deskripsi, uint8 status, uint256 jumlahDukungan, address pengirim, uint256 waktuDibuat, string catatanAdmin, bool sudahDukung))",
  "function getJumlahAspirasi() view returns (uint256)",
  "function admin() view returns (address)",
  "event AspirasiDiajukan(uint256 indexed id, string kategori, address indexed pengirim)",
  "event AspirasiDitolak(uint256 indexed id, string catatan, address indexed ditolakOleh)"
];

let provider = null, signer = null, contract = null, userAddr = null, isAdmin = false;
let cachedList = [], rejectTargetId = null, catatanTargetId = null;

// ── UI helpers ──
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById("toastContainer").appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
function addNotif(msg) {
  const log = document.getElementById("notifLog");
  if (log.querySelector("p")) log.innerHTML = "";
  const t = new Date().toLocaleTimeString();
  const item = document.createElement("div");
  item.className = "notif-item";
  item.innerHTML = `<span class="time">[${t}]</span> ${msg}`;
  log.prepend(item);
}
function updateCharCount() {
  document.getElementById("charCount").textContent = document.getElementById("catatanTolak").value.length;
}
function escapeHtml(text) { const d = document.createElement("div"); d.textContent = text; return d.innerHTML; }

// ── INTI KONEKSI (dipakai tombol connect MAUPUN auto-reconnect) ──
async function setupConnection(addr, account) {
  provider = new ethers.BrowserProvider(window.ethereum);
  signer   = await provider.getSigner(account);
  userAddr = (await signer.getAddress()).toLowerCase();
  contract = new ethers.Contract(addr, ABI, signer);

  let adminOnChain;
  try { adminOnChain = await contract.admin(); }
  catch (e) {
    toast("Kontrak tidak valid di alamat ini. Kalau Anvil di-restart, deploy ulang & paste alamat baru.", "error");
    resetConnection(); return;
  }
  isAdmin = adminOnChain.toLowerCase() === userAddr;
  localStorage.setItem("univoice_contract", addr);   // ← ingat alamat, biar refresh tidak kosong

  document.getElementById("statusBar").classList.add("connected");
  document.getElementById("statusText").innerHTML =
    `Terhubung · <span class="addr">${userAddr.slice(0,6)}...${userAddr.slice(-4)}</span>` +
    (isAdmin ? ` · 👑 <strong>Admin/BEM</strong>` : ` · 🎓 Mahasiswa`);
  addNotif(`Wallet aktif: ${userAddr.slice(0,10)}... ${isAdmin ? "(Admin)" : "(Mahasiswa)"}`);
  await muatData();
}

function resetConnection() {
  signer = null; contract = null; userAddr = null; isAdmin = false;
  document.getElementById("statusBar").classList.remove("connected");
  document.getElementById("statusText").textContent = "Belum terhubung";
  cachedList = [];
  document.getElementById("daftarAspirasi").innerHTML =
    `<p style="color:var(--text-dim)">Hubungkan kontrak terlebih dahulu untuk melihat aspirasi.</p>`;
}

// Tombol 🦊 (memicu pop-up hanya kalau belum pernah authorize)
async function connectMetaMask() {
  const addr = document.getElementById("contractAddr").value.trim();
  if (!addr) return toast("Isi alamat kontrak dulu!", "error");
  if (!window.ethereum) return toast("MetaMask tidak terdeteksi!", "error");
  try {
    const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16) }] });
    } catch (e) {
      if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16), chainName: "Anvil Local", rpcUrls: [RPC_URL], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }] });
    }
    await setupConnection(addr, accs[0]);
    toast("Terhubung!", "success");
  } catch (err) { toast("Gagal: " + (err.shortMessage || err.message), "error"); }
}

// ── READ ──
async function muatData() {
  const addr = document.getElementById("contractAddr").value.trim() || localStorage.getItem("univoice_contract");
  if (!addr) return toast("Isi alamat kontrak!", "error");
  try {
    if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
    // pakai signer kalau ada → tombol upvote/unvote akurat per-akun
    const c = signer ? new ethers.Contract(addr, ABI, signer) : new ethers.Contract(addr, ABI, provider);
    cachedList = await c.getAllAspirasi();
    renderFiltered();
  } catch (err) { toast("Gagal memuat: " + (err.shortMessage || err.message), "error"); }
}

// ── RENDER ──
function renderFiltered() {
  const show = document.getElementById("showRejected").checked;
  renderAspirasi(show ? cachedList : cachedList.filter(a => Number(a.status) !== 3));
}
function renderAspirasi(list) {
  const c = document.getElementById("daftarAspirasi");
  if (!list || list.length === 0) { c.innerHTML = `<p style="color:var(--text-dim)">Belum ada aspirasi.</p>`; return; }
  let html = "";
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    const tgl = new Date(Number(a.waktuDibuat) * 1000).toLocaleString("id-ID");
    const s = Number(a.status), rej = s === 3;
    html += `
    <div class="asp-card ${rej ? 'rejected' : ''}">
      <div class="asp-header"><span class="asp-id">${STATUS_ICON[s]} #${a.id.toString()}</span><span class="asp-kategori">${a.kategori}</span></div>
      <div class="asp-desc">${escapeHtml(a.deskripsi)}</div>
      <div class="asp-meta"><span>👤 ${a.pengirim.slice(0,6)}...${a.pengirim.slice(-4)}</span><span>🕐 ${tgl}</span><span class="status-badge ${STATUS_CLASS[s]}">${STATUS_LABEL[s]}</span></div>
      ${a.catatanAdmin ? `<div class="admin-notes ${rej ? 'rejected-note' : ''}"><div class="note-label">${rej ? '🚫 Alasan Penolakan:' : '📝 Catatan Admin:'}</div><div>${escapeHtml(a.catatanAdmin)}</div></div>` : ''}
      ${(s === 0 || s === 1) ? `<div class="vote-row"><span class="vote-count">${a.jumlahDukungan.toString()}</span><span style="font-size:.8rem;color:var(--text-dim)">dukungan</span>${a.sudahDukung ? `<button class="btn btn-yellow btn-sm" onclick="unvote(${a.id})">👎 Unvote</button>` : `<button class="btn btn-green btn-sm" onclick="upvote(${a.id})">👍 Upvote</button>`}</div>` : ''}
      ${isAdmin && !rej ? `<div class="admin-panel"><h3>👑 Panel Admin/BEM</h3><div class="btn-group">${s === 0 ? `<button class="btn btn-primary btn-sm" onclick="ubahStatus(${a.id}, 1)">▶️ Proses</button>` : ""}${s === 1 ? `<button class="btn btn-green btn-sm" onclick="ubahStatus(${a.id}, 2)">✅ Selesaikan</button>` : ""}<button class="btn btn-outline btn-sm" onclick="bukaModalCatatan(${a.id})">📝 Catatan</button><button class="btn btn-red btn-sm" onclick="bukaModalTolak(${a.id})">🚫 Tolak</button></div></div>` : ''}
    </div>`;
  }
  c.innerHTML = html;
}

// ── MODAL ──
function bukaModalTolak(id) { rejectTargetId = id; document.getElementById("modalId").textContent = id; document.getElementById("catatanTolak").value = ""; document.getElementById("charCount").textContent = "0"; document.getElementById("modalTolak").classList.add("active"); }
function tutupModal() { document.getElementById("modalTolak").classList.remove("active"); rejectTargetId = null; }
function bukaModalCatatan(id) { catatanTargetId = id; document.getElementById("modalCatatanId").textContent = id; document.getElementById("catatanUpdate").value = ""; document.getElementById("modalCatatan").classList.add("active"); }
function tutupModalCatatan() { document.getElementById("modalCatatan").classList.remove("active"); catatanTargetId = null; }

// ── WRITE ──
async function kirimAspirasi() {
  if (!signer) return toast("Hubungkan MetaMask!", "error");
  const kat = document.getElementById("kategori").value, desc = document.getElementById("deskripsi").value.trim();
  if (!desc) return toast("Deskripsi kosong!", "error");
  try {
    const tx = await contract.kirimAspirasi(kat, desc); const r = await tx.wait();
    toast(`Terkirim! Gas: ${r.gasUsed}`, "success"); addNotif(`📝 Aspirasi [${kat}] terkirim · gas ${r.gasUsed}`);
    document.getElementById("deskripsi").value = ""; await muatData();
  } catch (err) { toast("Gagal: " + (err.shortMessage || err.message), "error"); }
}
async function upvote(id) { if (!signer) return; try { const r = await (await contract.dukungAspirasi(id)).wait(); toast(`Upvote! Gas: ${r.gasUsed}`, "success"); await muatData(); } catch (e) { toast("Gagal: " + (e.shortMessage || e.message), "error"); } }
async function unvote(id) { if (!signer) return; try { const r = await (await contract.batalkanDukungan(id)).wait(); toast(`Unvote! Gas: ${r.gasUsed}`, "success"); await muatData(); } catch (e) { toast("Gagal: " + (e.shortMessage || e.message), "error"); } }
async function ubahStatus(id, s) { if (!signer) return; try { const r = await (await contract.ubahStatus(id, s)).wait(); toast(`Status → ${STATUS_LABEL[s]}! Gas: ${r.gasUsed}`, "success"); await muatData(); } catch (e) { toast("Gagal: " + (e.shortMessage || e.message), "error"); } }
async function eksekusiTolak() {
  if (!signer || !rejectTargetId) return;
  const cat = document.getElementById("catatanTolak").value.trim();
  if (!cat) return toast("Catatan WAJIB diisi!", "error");
  try { const r = await (await contract.tolakAspirasi(rejectTargetId, cat)).wait(); toast(`Ditolak! Gas: ${r.gasUsed}`, "success"); tutupModal(); await muatData(); } catch (e) { toast("Gagal: " + (e.shortMessage || e.message), "error"); }
}
async function eksekusiUpdateCatatan() {
  if (!signer || !catatanTargetId) return;
  const cat = document.getElementById("catatanUpdate").value.trim();
  if (!cat) return toast("Catatan kosong!", "error");
  try { const r = await (await contract.updateCatatanAdmin(catatanTargetId, cat)).wait(); toast(`Catatan disimpan! Gas: ${r.gasUsed}`, "success"); tutupModalCatatan(); await muatData(); } catch (e) { toast("Gagal: " + (e.shortMessage || e.message), "error"); } }

// ═══════════════════════════════════════════════════════
//  AUTO-RECONNECT + LISTENER  ← ini yang bikin "tidak hilang setelah refresh/ganti akun"
// ═══════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  // 1) kembalikan alamat kontrak dari localStorage (biar kolom tidak kosong setelah refresh)
  const saved = localStorage.getItem("univoice_contract");
  if (saved) document.getElementById("contractAddr").value = saved;

  if (!window.ethereum) return;

  // 2) auto-reconnect TANPA pop-up (eth_accounts hanya mengembalikan akun yang sudah di-authorize)
  try {
    const accs = await window.ethereum.request({ method: "eth_accounts" });
    const addr = document.getElementById("contractAddr").value.trim();
    if (accs && accs.length > 0 && addr) {
      await setupConnection(addr, accs[0]);   // data + tombol langsung akurat setelah refresh
    }
  } catch (e) { /* abaikan */ }

  // 3) dengarkan perubahan akun di MetaMask → web ikut ganti signer & reload data (TANPA refresh manual)
  window.ethereum.on("accountsChanged", async (accs) => {
    if (!accs || accs.length === 0) { resetConnection(); return; }
    const addr = document.getElementById("contractAddr").value.trim();
    if (addr) { await setupConnection(addr, accs[0]); toast("Akun MetaMask berubah — web diperbarui.", "info"); }
  });
  // 4) dengarkan perubahan jaringan
  window.ethereum.on("chainChanged", () => location.reload());
});