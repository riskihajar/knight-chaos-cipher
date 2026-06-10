# Penjelasan Rumus — KnightPermutation

## Rumus

```text
output[i] = state[permutation[i]]
```

Dengan syarat:

```text
permutation[i] adalah posisi source yang dapat dijangkau dari posisi i
menggunakan langkah kuda pada board 4×4
```

## Cara Membaca Rumus

> Output pada posisi i mengambil byte dari state pada posisi yang ditentukan oleh permutation i.

Contoh konsep:

```text
permutation[0] = 9
output[0] = state[9]
```

Artinya, cell output ke-0 mengambil byte dari cell source ke-9.

## Maksudnya

KnightPermutation adalah tahap **permutation**, yaitu mengubah posisi byte tanpa mengubah nilai byte tersebut.

State 16 byte dipetakan ke board 4×4:

```text
00  01  02  03
04  05  06  07
08  09  10  11
12  13  14  15
```

Setiap perpindahan mengikuti pola langkah kuda catur:

```text
2 kotak ke satu arah + 1 kotak ke arah lain
```

atau bentuk **L**.

## Cara Route Ditentukan

Route permutation ditentukan dari `roundSeed`.

Pada implementasi, dipilih mapping output ke source yang:

- valid sebagai langkah kuda,
- tidak memakai source yang sama dua kali,
- deterministic untuk key dan round yang sama.

## Kenapa Bisa Didekripsi?

Permutation ini bersifat bijektif:

- setiap source dipakai sekali,
- setiap output menerima satu source,
- sehingga inverse permutation bisa dibuat.

Saat decryption, posisi byte dikembalikan menggunakan inverse permutation.

## Narasi Siap Baca

> Pada step KnightPermutation, nilai byte tidak diganti, tetapi posisinya dipindahkan. State dipandang sebagai board 4×4, lalu setiap output mengambil byte dari source yang terhubung lewat langkah kuda berbentuk L. Route ini ditentukan dari round seed, sehingga untuk key dan round yang sama hasilnya deterministic. Karena mapping-nya bijektif, permutation ini bisa dibalik saat decryption.

---

## Versi Singkat

> KnightPermutation mengacak posisi byte berdasarkan langkah kuda pada board 4×4. Nilainya tetap, posisinya yang berubah.
