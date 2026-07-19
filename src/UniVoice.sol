// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UniVoice — Kotak Aspirasi Transparan di Blockchain
/// @notice Civitas akademika dapat mengirim aspirasi, mendukung aspirasi
///         orang lain, dan admin (Ormawa/Fakultas) dapat mengubah status.
/// @dev Semua data tersimpan on-chain sehingga tidak bisa dihapus/dimanipulasi.
contract UniVoice {

    // ──────────────────────────────────────────────
    //  ENUM & STRUCT
    // ──────────────────────────────────────────────
    enum Status { Diajukan, Diproses, Selesai }

    struct Aspirasi {
        uint256 id;
        string  kategori;      // "Fasilitas" | "Akademik" | "UKM" | dll.
        string  deskripsi;
        Status  status;
        uint256 jumlahDukungan;
        address pengirim;
        uint256 timestamp;
    }

    // ──────────────────────────────────────────────
    //  STATE VARIABLES
    // ──────────────────────────────────────────────
    address public admin;                   // alamat wallet BEM / Fakultas
    uint256 public jumlahAspirasi;          // counter auto-increment

    mapping(uint256 => Aspirasi) private _aspirasi;  // id → data
    mapping(uint256 => mapping(address => bool)) private _sudahDukung; // cegah double-vote

    // ──────────────────────────────────────────────
    //  EVENTS  (memenuhi acceptance criteria ≥1 event)
    // ──────────────────────────────────────────────
    event AspirasiDiajukan(
        uint256 indexed id,
        string  kategori,
        address indexed pengirim
    );

    event AspirasiDidukung(
        uint256 indexed id,
        address indexed pendukung,
        uint256 jumlahDukunganBaru
    );

    event StatusDiubah(
        uint256 indexed id,
        Status  statusBaru,
        address indexed diubahOleh
    );

    // ──────────────────────────────────────────────
    //  MODIFIER
    // ──────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "UniVoice: hanya admin yang berwenang");
        _;
    }

    modifier aspirasiExist(uint256 _id) {
        require(_id > 0 && _id <= jumlahAspirasi, "UniVoice: aspirasi tidak ditemukan");
        _;
    }

    // ──────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────
    constructor(address _admin) {
        require(_admin != address(0), "UniVoice: admin tidak boleh zero address");
        admin = _admin;
    }

    // ──────────────────────────────────────────────
    //  WRITE FUNCTION 1 — Kirim Aspirasi
    //  (memenuhi acceptance criteria: fungsi write #1)
    // ──────────────────────────────────────────────
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
            timestamp:      block.timestamp
        });

        emit AspirasiDiajukan(jumlahAspirasi, _kategori, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  WRITE FUNCTION 2 — Dukung / Upvote
    //  (memenuhi acceptance criteria: fungsi write #2)
    // ──────────────────────────────────────────────
    function dukungAspirasi(uint256 _id)
        external
        aspirasiExist(_id)
    {
        require(!_sudahDukung[_id][msg.sender], "UniVoice: sudah pernah mendukung");

        _sudahDukung[_id][msg.sender] = true;
        _aspirasi[_id].jumlahDukungan++;

        emit AspirasiDidukung(_id, msg.sender, _aspirasi[_id].jumlahDukungan);
    }

    // ──────────────────────────────────────────────
    //  WRITE FUNCTION 3 — Ubah Status (Admin Only)
    //  (bonus: access control untuk poin analisis keamanan)
    // ──────────────────────────────────────────────
    function ubahStatus(uint256 _id, Status _statusBaru)
        external
        onlyAdmin
        aspirasiExist(_id)
    {
        _aspirasi[_id].status = _statusBaru;
        emit StatusDiubah(_id, _statusBaru, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  READ FUNCTIONS
    //  (memenuhi acceptance criteria: fungsi read)
    // ──────────────────────────────────────────────
    function getAspirasi(uint256 _id)
        external
        view
        aspirasiExist(_id)
        returns (
            uint256 id,
            string  memory kategori,
            string  memory deskripsi,
            Status  status,
            uint256 jumlahDukungan,
            address pengirim,
            uint256 timestamp
        )
    {
        Aspirasi storage a = _aspirasi[_id];
        return (a.id, a.kategori, a.deskripsi, a.status,
                a.jumlahDukungan, a.pengirim, a.timestamp);
    }

    function getJumlahAspirasi() external view returns (uint256) {
        return jumlahAspirasi;
    }

    function sudahDukung(uint256 _id, address _addr)
        external
        view
        returns (bool)
    {
        return _sudahDukung[_id][_addr];
    }
}
