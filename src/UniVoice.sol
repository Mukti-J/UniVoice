// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UniVoice — Papan Aspirasi Kampus Transparan (v2 — Soft Delete)
/// @notice Kirim aspirasi, upvote/unvote, admin kelola status termasuk
///         moderasi (tolak + catatan alasan). Tidak ada penghapusan permanen.
contract UniVoice {

    // ──────────────────────────────────────────────
    //  ENUM & STRUCT
    // ──────────────────────────────────────────────
    enum Status {
        Diajukan,    // 0
        Diproses,    // 1
        Selesai,     // 2
        Ditolak      // 3 — Soft delete / moderasi
    }

    struct Aspirasi {
        uint256 id;
        string  kategori;
        string  deskripsi;
        Status  status;
        uint256 jumlahDukungan;
        address pengirim;
        uint256 waktuDibuat;
        string  catatanAdmin;   // Notes dari admin (alasan tolak, update proses, dll)
    }

    /// @dev Struct yang dikembalikan ke aplikasi (termasuk konteks caller)
    struct AspirasiView {
        uint256 id;
        string  kategori;
        string  deskripsi;
        uint8   status;            // 0-3
        uint256 jumlahDukungan;
        address pengirim;
        uint256 waktuDibuat;
        string  catatanAdmin;
        bool    sudahDukung;       // apakah caller sudah upvote
    }

    // ──────────────────────────────────────────────
    //  STATE
    // ──────────────────────────────────────────────
    address public admin;
    uint256 public jumlahAspirasi;

    mapping(uint256 => Aspirasi) private _aspirasi;
    mapping(uint256 => mapping(address => bool)) private _pendukung;

    // ──────────────────────────────────────────────
    //  EVENTS
    // ──────────────────────────────────────────────
    event AspirasiDiajukan(
        uint256 indexed id,
        string  kategori,
        address indexed pengirim
    );
    event AspirasiDidukung(
        uint256 indexed id,
        address indexed pendukung,
        uint256 jumlahBaru
    );
    event DukunganDibatalkan(
        uint256 indexed id,
        address indexed pendukung,
        uint256 jumlahBaru
    );
    event StatusDiubah(
        uint256 indexed id,
        uint8   statusBaru,
        address indexed diubahOleh
    );
    event AspirasiDitolak(
        uint256 indexed id,
        string  catatan,
        address indexed ditolakOleh
    );

    // ──────────────────────────────────────────────
    //  MODIFIER
    // ──────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "UniVoice: hanya admin/BEM");
        _;
    }

    modifier aspirasiExist(uint256 _id) {
        require(_id > 0 && _id <= jumlahAspirasi, "UniVoice: ID tidak valid");
        _;
    }

    // ──────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────
    constructor(address _admin) {
        require(_admin != address(0), "UniVoice: admin zero address");
        admin = _admin;
    }

    // ══════════════════════════════════════════════
    //  WRITE FUNCTIONS
    // ══════════════════════════════════════════════

    /// @notice WRITE 1 — Mahasiswa kirim aspirasi baru
    function kirimAspirasi(
        string calldata _kategori,
        string calldata _deskripsi
    ) external {
        require(bytes(_kategori).length > 0, "UniVoice: kategori kosong");
        require(bytes(_deskripsi).length > 0, "UniVoice: deskripsi kosong");

        jumlahAspirasi++;
        _aspirasi[jumlahAspirasi] = Aspirasi({
            id:             jumlahAspirasi,
            kategori:       _kategori,
            deskripsi:      _deskripsi,
            status:         Status.Diajukan,
            jumlahDukungan: 0,
            pengirim:       msg.sender,
            waktuDibuat:    block.timestamp,
            catatanAdmin:   ""
        });

        emit AspirasiDiajukan(jumlahAspirasi, _kategori, msg.sender);
    }

    /// @notice WRITE 2 — Upvote (hanya saat Diajukan / Diproses)
    function dukungAspirasi(uint256 _id) external aspirasiExist(_id) {
        require(
            _aspirasi[_id].status != Status.Selesai &&
            _aspirasi[_id].status != Status.Ditolak,
            "UniVoice: tidak bisa upvote aspirasi yang sudah selesai/ditolak"
        );
        require(!_pendukung[_id][msg.sender], "UniVoice: sudah mendukung");

        _pendukung[_id][msg.sender] = true;
        _aspirasi[_id].jumlahDukungan++;

        emit AspirasiDidukung(_id, msg.sender, _aspirasi[_id].jumlahDukungan);
    }

    /// @notice WRITE 3 — Unvote / batalkan dukungan
    function batalkanDukungan(uint256 _id) external aspirasiExist(_id) {
        require(_pendukung[_id][msg.sender], "UniVoice: belum mendukung");

        _pendukung[_id][msg.sender] = false;
        _aspirasi[_id].jumlahDukungan--;

        emit DukunganDibatalkan(_id, msg.sender, _aspirasi[_id].jumlahDukungan);
    }

    /// @notice WRITE 4 — Admin ubah status (Diajukan → Diproses → Selesai)
    /// @dev Tidak bisa mengubah ke Ditolak lewat sini, gunakan tolakAspirasi()
    function ubahStatus(uint256 _id, Status _statusBaru)
        external
        onlyAdmin
        aspirasiExist(_id)
    {
        require(
            _statusBaru != Status.Ditolak,
            "UniVoice: gunakan fungsi tolakAspirasi() untuk menolak"
        );
        _aspirasi[_id].status = _statusBaru;
        emit StatusDiubah(_id, uint8(_statusBaru), msg.sender);
    }

    /// @notice WRITE 5 — Admin tolak aspirasi + WAJIB isi catatan alasan
    /// @dev Soft delete: data tetap di blockchain, status = Ditolak
    function tolakAspirasi(uint256 _id, string calldata _catatan)
        external
        onlyAdmin
        aspirasiExist(_id)
    {
        require(
            bytes(_catatan).length > 0,
            "UniVoice: catatan penolakan WAJIB diisi"
        );

        _aspirasi[_id].status = Status.Ditolak;
        _aspirasi[_id].catatanAdmin = _catatan;

        emit AspirasiDitolak(_id, _catatan, msg.sender);
    }

    /// @notice WRITE 6 — Admin tambah/update catatan pada aspirasi (opsional)
    /// @dev Bisa digunakan untuk update progress saat status = Diproses
    function updateCatatanAdmin(uint256 _id, string calldata _catatan)
        external
        onlyAdmin
        aspirasiExist(_id)
    {
        _aspirasi[_id].catatanAdmin = _catatan;
    }

    // ══════════════════════════════════════════════
    //  READ FUNCTIONS
    // ══════════════════════════════════════════════

    function getAspirasi(uint256 _id)
        external
        view
        aspirasiExist(_id)
        returns (AspirasiView memory)
    {
        return _buildView(_id);
    }

    function getAllAspirasi() external view returns (AspirasiView[] memory) {
        AspirasiView[] memory hasil = new AspirasiView[](jumlahAspirasi);
        for (uint256 i = 1; i <= jumlahAspirasi; i++) {
            hasil[i - 1] = _buildView(i);
        }
        return hasil;
    }

    function getJumlahAspirasi() external view returns (uint256) {
        return jumlahAspirasi;
    }

    function sudahDukung(uint256 _id, address _addr) external view returns (bool) {
        return _pendukung[_id][_addr];
    }

    // ──────────────────────────────────────────────
    //  INTERNAL HELPER
    // ──────────────────────────────────────────────
    function _buildView(uint256 _id) internal view returns (AspirasiView memory) {
        Aspirasi storage a = _aspirasi[_id];
        return AspirasiView({
            id:             a.id,
            kategori:       a.kategori,
            deskripsi:      a.deskripsi,
            status:         uint8(a.status),
            jumlahDukungan: a.jumlahDukungan,
            pengirim:       a.pengirim,
            waktuDibuat:    a.waktuDibuat,
            catatanAdmin:   a.catatanAdmin,
            sudahDukung:    _pendukung[_id][msg.sender]
        });
    }
}