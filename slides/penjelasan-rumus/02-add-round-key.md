# Penjelasan Rumus — AddRoundKey

## Rumus

```text
state[i] = state[i] XOR roundKey[i]
```

Untuk semua byte dalam satu block:

```text
state = state XOR roundKey
```

## Cara Membaca Rumus

> Setiap byte pada state di-XOR dengan byte round key pada posisi yang sama.

Contoh:

```text
state[0]    XOR roundKey[0]    = output[0]
state[1]    XOR roundKey[1]    = output[1]
...
state[15]   XOR roundKey[15]   = output[15]
```

## Maksudnya

AddRoundKey adalah step yang mencampurkan state dengan material key pada round aktif.

Round key tidak diambil langsung dari key utama. Key utama diproses terlebih dahulu menggunakan key schedule berbasis SHA-256 untuk menghasilkan material key per round.

Dengan begitu, setiap round memiliki round key yang berbeda.

## Kenapa Menggunakan XOR?

XOR dipakai karena sederhana dan reversible.

Sifat penting XOR:

```text
A XOR B XOR B = A
```

Artinya, jika saat enkripsi state dicampur dengan round key, saat dekripsi campuran itu bisa dibalik dengan round key yang sama.

## Narasi Siap Baca

> Pada step AddRoundKey, setiap byte state di-XOR dengan byte round key pada posisi yang sama. Round key ini berasal dari key schedule, jadi key utama tidak langsung dipakai mentah. XOR dipilih karena operasinya reversible: kalau nilai di-XOR dengan key, lalu di-XOR lagi dengan key yang sama, nilainya bisa kembali.

---

## Versi Singkat

> AddRoundKey mencampurkan state dengan round key menggunakan XOR per byte, dan operasi ini bisa dibalik saat decryption.
