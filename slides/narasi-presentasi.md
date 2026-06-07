# Narasi Presentasi — Knight-Chaos Cipher

> File ini adalah script siap baca saat presentasi. Satu section = satu slide.

---

## Slide 1: Latar Belakang

Jadi tugas kali ini adalah merancang algoritma kriptografi baru. Yang saya buat namanya Knight-Chaos Cipher, atau KCC-128. Idenya menggabungkan dua hal: logika permainan catur — khususnya langkah kuda — dan chaotic map dari matematika. Dua konsep ini saya masukkan ke dalam struktur cipher sebagai komponen substitution dan permutation.

---

## Slide 2: Ide Utama

KCC-128 ini block cipher, block size-nya 128 bit atau 16 byte. Setiap block saya representasikan sebagai board 4×4. Algoritmanya jalan 10 round. S-Box-nya di-generate ulang setiap round menggunakan logistic chaotic map, jadi setiap round punya tabel substitusi sendiri. Untuk permutation, saya menggunakan pola langkah kuda catur yang loncatnya bentuk L.

---

## Slide 3: Pembeda dari Cipher Umum

Kalau dibanding AES: AES menggunakan satu S-Box tetap untuk semua round — di KCC-128, S-Box-nya berubah tiap round. AES menggunakan ShiftRows yang gesernya linear — KCC-128 menggunakan knight's tour yang loncatnya non-linear. Dan key schedule di KCC-128 juga menentukan bentuk S-Box, rute kuda, dan jumlah rotasi bit. Jadi key mengubah seluruh struktur cipher sekaligus.

---

## Slide 4: Arsitektur Round

Setiap round ada 6 step. Pertama, AddRoundKey — state di-XOR dengan round key. Kedua, ChaoticSubBytes — setiap byte diganti menggunakan S-Box dinamis. Ketiga, KnightPermutation — posisi byte di-shuffle menggunakan jalur kuda. Keempat, BitShiftMix — bit di dalam byte dirotasi. Kelima, ByteDiffusion — XOR berantai supaya perubahan satu byte menyebar ke byte-byte lain. Keenam, FeistelMix — mixing berpasangan 3 kali pass untuk memperkuat diffusion.

---

## Slide 5: Dynamic S-Box

S-Box-nya dibuat dari logistic chaotic map: x baru sama dengan r kali x kali satu minus x. Rumus ini diiterasi berkali-kali untuk menghasilkan deret bilangan yang kelihatan acak tapi deterministic. Deret ini digunakan untuk mengurutkan byte 0 sampai 255 — hasilnya jadi tabel substitusi. Karena bentuknya permutation, inverse-nya bisa langsung dihitung untuk decryption.

---

## Slide 6: Knight Permutation

Block 16 byte di-map ke board 4×4. Lalu posisi byte di-shuffle mengikuti langkah kuda — yang geraknya bentuk L: 2 kotak ke satu arah, 1 kotak ke arah lain. Starting position ditentukan round seed. Kalau ada beberapa pilihan langkah, dipilih yang punya paling sedikit langkah lanjutan — ini namanya Warnsdorff's heuristic. Kalau masih seri, round seed jadi tiebreaker.

---

## Slide 7: Diffusion dan Chaining

Diffusion ini tugasnya menyebarkan perubahan antar byte. ByteDiffusion memastikan kalau satu byte berubah, semua byte setelahnya ikut terpengaruh — seperti efek domino. FeistelMix menambah 3 pass mixing berpasangan untuk memperkuat penyebaran. Dan untuk multi-block, saya menggunakan CBC mode — block berikutnya di-XOR dengan ciphertext block sebelumnya, supaya setiap block punya dependensi ke block sebelumnya.

---

## Slide 8: Tech Stack

Secara ringkas: block size 128 bit, 10 round, S-Box dari logistic chaotic map, permutation dari knight's tour dengan Warnsdorff, mode CBC, key schedule menggunakan SHA-256, dan padding PKCS#7.

---

## Slide 9: Hasil Sample Run

Saya jalankan encryption dengan plaintext "Cyber Security Tugas 3..." dan key berbasis NIM saya. Hasilnya: decryption berhasil — plaintext kembali utuh. Entropy plaintext sekitar 4.4 bit per byte, naik ke 6.6 setelah encryption. Dan avalanche effect-nya sekitar 50 persen — artinya ubah 1 bit input, sekitar setengah bit output berubah.

---

## Slide 10: Analisis Keamanan

Entropy naik dari 4.4 ke 6.6 — ciphertext distribusi byte-nya lebih uniform. Avalanche 50 persen sesuai ekspektasi untuk cipher dengan diffusion yang baik. Distribusi byte ciphertext juga merata, tanpa satu value yang dominan. KCC-128 memutus hubungan langsung plaintext–ciphertext lewat non-linear S-Box, permutation, dan diffusion — tiga layer sekaligus.

---

## Slide 11: Keterbatasan

Dari sisi keterbatasan: IV-nya masih deterministic dari key, idealnya random. Saat ini cipher menjamin confidentiality — untuk integrity, bisa ditambahkan MAC atau HMAC di pengembangan selanjutnya. Kualitas S-Box dari sisi nonlinearity juga bisa diuji lebih lanjut. Dan pengujian bisa diperluas dengan dataset yang lebih besar.

---

## Slide 12: Kesimpulan

Jadi KCC-128 ini memodifikasi empat komponen cipher: substitution menggunakan chaotic S-Box, permutation menggunakan knight's tour, diffusion menggunakan XOR chaining dan Feistel mix, dan key schedule yang mengubah seluruh struktur round. Dari pengujian, encryption-decryption bekerja benar dan avalanche effect-nya mendekati 50 persen.

---

## Kalau Ada Pertanyaan

**"IV itu apa?"**
→ Initialization Vector, nilai awal 16 byte yang di-XOR ke block pertama. Di-derive dari key menggunakan SHA-256.

**"XOR itu apa?"**
→ Operasi bit: kalau sama hasilnya 0, kalau beda hasilnya 1. Sifat pentingnya: A XOR B XOR B = A — reversible, jadi bisa digunakan untuk encryption dan decryption.

**"S-Box cara kerjanya gimana?"**
→ Tabel lookup. Masuk 0x12, cari baris ke-18 di tabel, keluar 0xCD. Saat encryption tinggal cari di tabel.

**"Round key dari mana?"**
→ masterSeed = SHA256(key), roundSeed = SHA256(masterSeed + nomor round), roundKey = SHA256(roundSeed + 0) ambil 16 byte pertama. Setiap round dapat key yang berbeda.

**"Kenapa menggunakan langkah kuda?"**
→ Langkah kuda menghasilkan perpindahan non-linear — lompat bentuk L yang menyebar ke baris dan kolom berbeda sekaligus. Hasilnya permutation yang lebih sulit diprediksi.

**"Bedanya dengan AES?"**
→ AES S-Box tetap, ShiftRows linear, key schedule menghasilkan round key saja. KCC-128 S-Box berubah tiap round, permutation non-linear dari chess, dan key mengubah seluruh struktur round.
