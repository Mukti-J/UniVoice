// app/web.js
const RPC_URL    = "http://127.0.0.1:8545";
const CHAIN_ID   = 31337;

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
  const time = new Date().toLocaleTimeString();
  const item = document.createElement("div");
  item.className = "notif-item";
  item.innerHTML = `<span class="time">[${time}]</span> ${msg}`;
  log.prepend(item);
}

function updateCharCount() {
  document.getElementById("charCount").textContent = document.getElementById("catatanTolak").value.length;
}

async function connectMetaMask() {
  const addr = document.getElementById("contractAddr").value.trim();
  if (!addr) return toast("Isi alamat kontrak!", "error");
  if (!window.ethereum) return toast("MetaMask tidak terdeteksi!", "error");

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddr = accounts[0];
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16) }] });
    } catch (e) {
      if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16), chainName: "Anvil Local", rpcUrls: [RPC_URL], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }] });
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    signer   = await provider.getSigner();
    contract = new ethers.Contract(addr, ABI, signer);
    const adminOnChain = await contract.admin();
    isAdmin = adminOnChain.toLowerCase() === userAddr.toLowerCase();

    document.getElementById("statusBar").classList.add("connected");
    document.getElementById("statusText").innerHTML = `Terhubung · <span class="addr">${userAddr.slice(0,6)}...${userAddr.slice(-4)}</span>` + (isAdmin ? ` · 👑 Admin` : ` · 🎓 Mahasiswa`);
    toast("Terhubung!", "success");
    await muatData();
  } catch (err) { toast("Gagal: " + (err.shortMessage || err.message), "error"); }
}

async function muatData() {
  const addr = document.getElementById("contractAddr").value.trim();
  if (!addr) return toast("Isi alamat kontrak!", "error");
  try {
    if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
    const c = signer ? new ethers.Contract(addr, ABI, signer) : new ethers.Contract(addr, ABI, provider);
    cachedList = await c.getAllAspirasi();
    renderFiltered();
  } catch (err) { toast("Gagal memuat: " + (err.shortMessage || err.message), "error"); }
}

function renderFiltered() {
  const showRejected = document.getElementById("showRejected").checked;
  const filtered = showRejected ? cachedList : cachedList.filter(a => Number(a.status) !== 3);
  renderAspirasi(filtered);
}

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function renderAspirasi(list) {
  const container = document.getElementById("daftarAspirasi");
  if (!list || list.length === 0) { container.innerHTML = `<p style="color:var(--text-dim)">Belum ada aspirasi.</p>`; return; }
  let html = "";
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    const tgl = new Date(Number(a.waktuDibuat) * 1000).toLocaleString("id-ID");
    const s = Number(a.status);
    const isRejected = s === 3;
    html += `
    <div class="asp-card ${isRejected ? 'rejected' : ''}">
      <div class="asp-header"><span class="asp-id">${STATUS_ICON[s]} #${a.id.toString()}</span><span class="asp-kategori">${a.kategori}</span></div>
      <div class="asp-desc">${escapeHtml(a.deskripsi)}</div>
      <div class="asp-meta"><span>👤 ${a.pengirim.slice(0,6)}...</span><span>🕐 ${tgl}</span><span class="status-badge ${STATUS_CLASS[s]}">${STATUS_LABEL[s]}</span></div>
      ${a.catatanAdmin ? `<div class="admin-notes ${isRejected ? 'rejected-note' : ''}"><div class="note-label">${isRejected ? '🚫 Alasan Penolakan:' : '📝 Catatan Admin:'}</div><div>${escapeHtml(a.catatanAdmin)}</div></div>` : ''}
      ${(s === 0 || s === 1) ? `<div class="vote-row"><span class="vote-count">${a.jumlahDukungan.toString()}</span><span style="font-size:.8rem;color:var(--text-dim)">dukungan</span>${a.sudahDukung ? `<button class="btn btn-yellow btn-sm" onclick="unvote(${a.id})">👎 Unvote</button>` : `<button class="btn btn-green btn-sm" onclick="upvote(${a.id})">👍 Upvote</button>`}</div>` : ''}
      ${isAdmin && !isRejected ? `<div class="admin-panel"><h3>👑 Panel Admin</h3><div class="btn-group">${s === 0 ? `<button class="btn btn-primary btn-sm" onclick="ubahStatus(${a.id}, 1)">▶️ Proses</button>` : ""}${s === 1 ? `<button class="btn btn-green btn-sm" onclick="ubahStatus(${a.id}, 2)">✅ Selesaikan</button>` : ""}<button class="btn btn-outline btn-sm" onclick="bukaModalCatatan(${a.id})">📝 Catatan</button><button class="btn btn-red btn-sm" onclick="bukaModalTolak(${a.id})">🚫 Tolak</button></div></div>` : ''}
    </div>`;
  }
  container.innerHTML = html;
}

function bukaModalTolak(id) { rejectTargetId = id; document.getElementById("modalId").textContent = id; document.getElementById("catatanTolak").value = ""; document.getElementById("charCount").textContent = "0"; document.getElementById("modalTolak").classList.add("active"); }
function tutupModal() { document.getElementById("modalTolak").classList.remove("active"); rejectTargetId = null; }
function bukaModalCatatan(id) { catatanTargetId = id; document.getElementById("modalCatatanId").textContent = id; document.getElementById("catatanUpdate").value = ""; document.getElementById("modalCatatan").classList.add("active"); }
function tutupModalCatatan() { document.getElementById("modalCatatan").classList.remove("active"); catatanTargetId = null; }

async function kirimAspirasi() {
  if (!signer) return toast("Hubungkan MetaMask!", "error");
  const kat = document.getElementById("kategori").value, desc = document.getElementById("deskripsi").value.trim();
  if (!desc) return toast("Deskripsi kosong!", "error");
  try {
    const tx = await contract.kirimAspirasi(kat, desc); const r = await tx.wait();
    toast(`Terkirim! Gas: ${r.gasUsed}`, "success"); addNotif(`📝 Aspirasi [${kat}] terkirim`);
    document.getElementById("deskripsi").value = ""; await muatData();
  } catch (err) { toast("Gagal: " + (err.shortMessage || err.message), "error"); }
}
async function upvote(id) { if (!signer) return; try { const tx = await contract.dukungAspirasi(id); const r = await tx.wait(); toast(`Upvote! Gas: ${r.gasUsed}`, "success"); await muatData(); } catch (err) { toast("Gagal", "error"); } }
async function unvote(id) { if (!signer) return; try { const tx = await contract.batalkanDukungan(id); await tx.wait(); toast(`Unvote berhasil`, "success"); await muatData(); } catch (err) { toast("Gagal", "error"); } }
async function ubahStatus(id, s) { if (!signer) return; try { const tx = await contract.ubahStatus(id, s); await tx.wait(); toast(`Status diubah`, "success"); await muatData(); } catch (err) { toast("Gagal", "error"); } }
async function eksekusiTolak() {
  if (!signer || !rejectTargetId) return;
  const catatan = document.getElementById("catatanTolak").value.trim();
  if (!catatan) return toast("Catatan WAJIB diisi!", "error");
  try { const tx = await contract.tolakAspirasi(rejectTargetId, catatan); await tx.wait(); toast(`Ditolak!`, "success"); tutupModal(); await muatData(); } catch (err) { toast("Gagal", "error"); }
}
async function eksekusiUpdateCatatan() {
  if (!signer || !catatanTargetId) return;
  const catatan = document.getElementById("catatanUpdate").value.trim();
  if (!catatan) return toast("Catatan kosong!", "error");
  try { const tx = await contract.updateCatatanAdmin(catatanTargetId, catatan); await tx.wait(); toast(`Catatan disimpan`, "success"); tutupModalCatatan(); await muatData(); } catch (err) { toast("Gagal", "error"); }
}