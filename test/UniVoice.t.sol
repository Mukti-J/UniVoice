// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/UniVoice.sol";

contract UniVoiceTest is Test {
    UniVoice public uv;
    address  public admin = address(0xBEEF);
    address  public mhs1  = address(0x1);
    address  public mhs2  = address(0x2);

    function setUp() public {
        uv = new UniVoice(admin);
    }

    // ── Kirim Aspirasi ──
    function testKirimAspirasi() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "AC perpustakaan rusak");
        assertEq(uv.jumlahAspirasi(), 1);
    }

    // ── Upvote ──
    function testUpvote() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Akademik", "Jadwal bentrok");

        vm.prank(mhs2);
        uv.dukungAspirasi(1);

        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.jumlahDukungan, 1);
    }

    // ── Unvote ──
    function testUnvote() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("UKM", "Dana kurang");

        vm.prank(mhs2);
        uv.dukungAspirasi(1);
        vm.prank(mhs2);
        uv.batalkanDukungan(1);

        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.jumlahDukungan, 0);
    }

    // ── Double Vote Dicegah ──
    function testDoubleVoteRevert() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "WiFi lambat");

        vm.prank(mhs2);
        uv.dukungAspirasi(1);

        vm.prank(mhs2);
        vm.expectRevert("UniVoice: sudah mendukung");
        uv.dukungAspirasi(1);
    }

    // ── Tidak Bisa Upvote Jika Ditolak ──
    function testUpvoteDitolakRevert() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "Spam content");

        vm.prank(admin);
        uv.tolakAspirasi(1, "Konten tidak sesuai aturan");

        vm.prank(mhs2);
        vm.expectRevert("UniVoice: tidak bisa upvote aspirasi yang sudah selesai/ditolak");
        uv.dukungAspirasi(1);
    }

    // ── Admin Ubah Status ──
    function testUbahStatus() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "AC rusak");

        vm.prank(admin);
        uv.ubahStatus(1, UniVoice.Status.Diproses);

        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.status, 1);
    }

    // ── Tolak Aspirasi + Catatan ──
    function testTolakAspirasi() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "asdfghjkl spam");

        vm.prank(admin);
        uv.tolakAspirasi(1, "Aspirasi mengandung spam, tidak ada substansi");

        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.status, 3); // Ditolak
        assertEq(a.catatanAdmin, "Aspirasi mengandung spam, tidak ada substansi");
    }

    // ── Tolak Tanpa Catatan = Gagal ──
    function testTolakTanpaCatatanRevert() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "Test");

        vm.prank(admin);
        vm.expectRevert("UniVoice: catatan penolakan WAJIB diisi");
        uv.tolakAspirasi(1, "");
    }

    // ── Non-Admin Tidak Bisa Tolak ──
    function testNonAdminTolakRevert() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "Test");

        vm.prank(mhs2);
        vm.expectRevert("UniVoice: hanya admin/BEM");
        uv.tolakAspirasi(1, "Alasan");
    }

    // ── Update Catatan Admin ──
    function testUpdateCatatan() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Akademik", "Dosen telat");

        vm.prank(admin);
        uv.ubahStatus(1, UniVoice.Status.Diproses);

        vm.prank(admin);
        uv.updateCatatanAdmin(1, "Sudah dilaporkan ke dekanat, menunggu tindak lanjut");

        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.catatanAdmin, "Sudah dilaporkan ke dekanat, menunggu tindak lanjut");
    }

    // ── Ubah Status ke Ditolak via ubahStatus = Gagal ──
    function testUbahStatusKeDitolakRevert() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "Test");

        vm.prank(admin);
        vm.expectRevert("UniVoice: gunakan fungsi tolakAspirasi() untuk menolak");
        uv.ubahStatus(1, UniVoice.Status.Ditolak);
    }

    // ── Data Tetap Ada Setelah Ditolak (Soft Delete Proof) ──
    function testDataTetapAdaSetelahDitolak() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "Kritik pedas terhadap BEM");

        vm.prank(admin);
        uv.tolakAspirasi(1, "Melanggar kode etik");

        // Data masih bisa dibaca — ini bukti soft delete
        UniVoice.AspirasiView memory a = uv.getAspirasi(1);
        assertEq(a.deskripsi, "Kritik pedas terhadap BEM");
        assertEq(a.pengirim, mhs1);
        assertEq(a.status, 3);
        // Data TIDAK hilang, hanya status berubah
    }

    // ── getAllAspirasi ──
    function testGetAllAspirasi() public {
        vm.prank(mhs1);
        uv.kirimAspirasi("Fasilitas", "A");
        vm.prank(mhs2);
        uv.kirimAspirasi("Akademik", "B");

        UniVoice.AspirasiView[] memory semua = uv.getAllAspirasi();
        assertEq(semua.length, 2);
    }
}

// ── ADMIN DILARANG KIRIM ASPIRASI (netralitas) ──
function testAdminTidakBolehKirimAspirasi() public {
    vm.prank(admin);
    vm.expectRevert("UniVoice: admin/BEM harus netral, dilarang jadi peserta");
    uv.kirimAspirasi("Fasilitas", "Coba-coba kirim sebagai admin");

    // state tidak berubah (atomicity): tetap 0 aspirasi
    assertEq(uv.getJumlahAspirasi(), 0);
}

// ── (PAKAI HANYA JIKA Anda mengaktifkan opsi netral penuh di 1.c) ──
function testAdminTidakBolehUpvote() public {
    vm.prank(mhs1);
    uv.kirimAspirasi("Akademik", "Aspirasi mahasiswa");

    vm.prank(admin);
    vm.expectRevert("UniVoice: admin/BEM harus netral, dilarang jadi peserta");
    uv.dukungAspirasi(1);
}

// ── Pastikan admin TETAP bisa mengelola (tidak ikut terblokir) ──
function testAdminTetapBisaUbahStatus() public {
    vm.prank(mhs1);
    uv.kirimAspirasi("Fasilitas", "AC rusak");

    vm.prank(admin);
    uv.ubahStatus(1, UniVoice.Status.Diproses);   // harus sukses

    UniVoice.AspirasiView memory a = uv.getAspirasi(1);
    assertEq(a.status, 1);
}