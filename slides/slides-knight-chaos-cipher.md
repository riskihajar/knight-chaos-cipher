---
title: "Knight-Chaos Cipher"
subtitle: "Algoritma Kriptografi Berbasis Langkah Kuda Catur dan Chaotic Map"
author: "Muhammad Rizky Hajar · 24.55.2714"
date: "Cyber Security · 10 Juni 2026"
---

# Latar Belakang

- Tugas: merancang algoritma kriptografi baru.
- Fokus: modifikasi komponen utama cipher.
- Menggabungkan game logic dan chaotic map pada struktur cipher.
- Target: encryption, decryption, demo, dan analisis keamanan.

# Ide Utama

**Knight-Chaos Cipher (KCC-128)**

- Block cipher 128 bit (16 byte per block).
- 10 round transformation.
- Board 4×4 merepresentasikan 16 byte.
- Knight's tour menjadi permutation internal.
- Logistic chaotic map men-generate dynamic S-Box per round.

# Pembeda dari Cipher Umum

| Komponen | AES | KCC-128 |
|----------|-----|---------|
| S-Box | Tetap (1 untuk semua round) | Dynamic, berubah tiap round (chaotic map) |
| Permutation | ShiftRows (linear shift) | Knight's tour (non-linear, L-shape) |
| Key Schedule | Menghasilkan round key saja | Mengubah S-Box, route, rotation, diffusion |

# Arsitektur Round (6 Step per Round)

1. **AddRoundKey** — XOR state dengan round key
2. **ChaoticSubBytes** — substitute byte pakai dynamic S-Box
3. **KnightPermutation** — shuffle posisi byte pakai knight path
4. **BitShiftMix** — rotate bit dalam setiap byte
5. **ByteDiffusion** — XOR chaining antar byte (propagation)
6. **FeistelMix** — pair-wise mixing 3 pass

# Dynamic S-Box

Logistic chaotic map:

```text
x(n+1) = r * x(n) * (1 - x(n))
```

- Initial value `x` di-derive dari round seed.
- Parameter `r` berubah per round.
- Output chaotic dipakai untuk men-sort byte 0..255.
- Hasilnya: S-Box invertible (bisa di-reverse untuk decryption).

# Knight Permutation

- Block 16 byte di-map ke board 4×4.
- Posisi byte di-shuffle mengikuti knight move (L-shape: 2+1 cell).
- Starting position ditentukan round seed.
- Selection: Warnsdorff's heuristic (min onward moves).
- Tie-breaking menggunakan round seed.

# Diffusion dan Chaining

- **BitShiftMix:** rotate bit di dalam byte → spread intra-byte.
- **ByteDiffusion:** XOR chaining → 1 byte berubah, propagate ke semua byte setelahnya.
- **FeistelMix:** pair-wise mixing 3 pass → strengthen avalanche.
- **CBC mode:** block berikutnya di-XOR dengan ciphertext block sebelumnya.
- Semua operation invertible → decryption tetap possible.

# Tech Stack

| Parameter | Value |
|-----------|-------|
| Algorithm | KCC-128 (Block Cipher) |
| Block Size | 128 bit (16 byte, matrix 4×4) |
| Rounds | 10 |
| S-Box | Logistic Chaotic Map (dynamic/round) |
| Permutation | Knight's Tour (Warnsdorff) |
| Mode | CBC (Cipher Block Chaining) |
| Key Schedule | SHA-256 |
| Padding | PKCS#7 |

# Hasil Sample Run

```text
Plaintext:  "Ini adalah Pesan Rahasia"
Key:        "kunci-rahasia-123"
Decryption: OK ✓
```

| Metrik | Nilai |
|--------|-------|
| Plaintext entropy | ~3.23 bit/byte |
| Ciphertext entropy | ~4.94 bit/byte |
| Avalanche effect | ~50.00% |

# Analisis Keamanan

- **Entropy:** naik dari 3.23 → 4.94 bit/byte (lebih uniform).
- **Avalanche:** ~50% — ubah 1 bit input, ~setengah bit output berubah.
- **Frequency:** tidak ada byte value yang dominan pada ciphertext.
- **vs. Caesar/Vigenere:** KCC-128 memutus hubungan langsung plaintext–ciphertext melalui non-linear S-Box + permutation + diffusion.

# Keterbatasan

- IV di-derive deterministic dari key (idealnya random).
- Belum ada MAC/HMAC (hanya confidentiality, belum integrity).
- S-Box nonlinearity dan differential uniformity belum diuji formal.
- Pengujian perlu diperluas dengan dataset yang lebih besar.

# Kesimpulan

- KCC-128 memodifikasi substitution, permutation, diffusion, dan key schedule.
- Knight's tour sebagai permutation → non-linear, game-based.
- Chaotic map sebagai S-Box generator → dynamic per round.
- Encryption-decryption bekerja benar, avalanche ~50%.
