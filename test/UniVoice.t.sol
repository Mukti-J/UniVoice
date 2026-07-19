// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/UniVoice.sol";

contract UniVoiceTest is Test {

    UniVoice public uniVoice;
    address  public admin   = address(0xBEEF);
    address  public mahasiswa1 = address(0x1);
    address  public mahasiswa2 = address(0x2);

    function setUp() public {
        uniVoice = new UniVoice(admin);
    }

    // ── Test Write 1: Kirim Aspirasi ──
    function testKirimAspirasi() public {
        vm.prank(mahasiswa1);
        uniVoice.kirimAspirasi("Fasilitas", "AC perpustakaan rusak");

        assertEq(uniVoice.jumlahAspirasi(), 1);

        (uint256 id, string memory kat, string memory desc,
         UniVoice.Status st, uint256 duk, address peng, ) = uniVoice.getAspirasi(1);

        assertEq(id, 1);
        assertEq(kat, "Fasilitas");
        assertEq(desc, "AC perpustakaan rusak");
        assertTrue(st == UniVoice.Status.Diajukan);
        assertEq(duk, 0);
        assertEq(peng, mahasiswa1);
    }

    // ── Test Write 2: Dukung Aspirasi ──
    function testDukungAspirasi() public {
        vm.prank(mahasiswa1);
        uniVoice.kirimAspirasi("Akademik", "Jadwal kuliah bentrok");

        vm.prank(mahasiswa2);
        uniVoice.dukungAspirasi(1);

        (, , , , uint256 duk, , ) = uniVoice.getAspirasi(1);
        assertEq(duk, 1);
    }

    // ── Test Double Vote Dicegah ──
    function testDoubleVoteRevert() public {
        vm.prank(mahasiswa1);
        uniVoice.kirimAspirasi("UKM", "Dana UKM kurang");

        vm.prank(mahasiswa2);
        uniVoice.dukungAspirasi(1);

        vm.prank(mahasiswa2);
        vm.expectRevert("UniVoice: sudah pernah mendukung");
        uniVoice.dukungAspirasi(1);
    }

    // ── Test Admin Ubah Status ──
    function testUbahStatus() public {
        vm.prank(mahasiswa1);
        uniVoice.kirimAspirasi("Fasilitas", "WiFi lambat");

        vm.prank(admin);
        uniVoice.ubahStatus(1, UniVoice.Status.Diproses);

        (, , , UniVoice.Status st, , , ) = uniVoice.getAspirasi(1);
        assertTrue(st == UniVoice.Status.Diproses);
    }

    // ── Test Non-Admin Tidak Bisa Ubah Status ──
    function testNonAdminRevert() public {
        vm.prank(mahasiswa1);
        uniVoice.kirimAspirasi("Akademik", "Dosen sering telat");

        vm.prank(mahasiswa2);
        vm.expectRevert("UniVoice: hanya admin yang berwenang");
        uniVoice.ubahStatus(1, UniVoice.Status.Selesai);
    }
}
