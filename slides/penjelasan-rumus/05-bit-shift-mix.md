# Penjelasan Rumus — BitShiftMix

## Rumus Rotasi

```text
output[i] = ROTL(state[i], rotation[i])
```

Untuk decryption:

```text
state[i] = ROTR(output[i], rotation[i])
```

Jumlah rotasi:

```text
rotation[i] = ((roundSeed[i] + i + roundIndex) mod 7) + 1
```

## Cara Membaca Rumus

> Output pada posisi i sama dengan byte state pada posisi i yang di-rotate left sebanyak rotation i bit.

Untuk jumlah rotasi:

> Nilai rotasi pada posisi i dihitung dari round seed, indeks byte, dan indeks round, lalu dibatasi menjadi 1 sampai 7 bit.

## Maksudnya

BitShiftMix bekerja pada level bit di dalam satu byte.

Yang digeser bukan posisi byte di matrix, tetapi susunan bit di dalam byte tersebut.

Contoh:

```text
10110010 ROTL 3 = 10010101
```

Tiga bit paling kiri keluar:

```text
101
```

lalu masuk lagi dari kanan:

```text
10010 101
```

## Kenapa Ada Rotasi 3, 6, 1, dan Lainnya?

Karena setiap byte mendapat jumlah rotasi yang berbeda.

Nilainya diturunkan dari:

- `roundSeed`,
- posisi byte `i`,
- nomor round `roundIndex`.

Hasilnya dibatasi antara 1 sampai 7 bit.

Nilai 0 dan 8 tidak digunakan karena pada byte 8-bit, rotasi 0 atau 8 akan membuat susunan bit kembali sama.

## Kenapa Bisa Didekripsi?

Rotate left bisa dibalik dengan rotate right menggunakan jumlah rotasi yang sama.

Contoh:

```text
Enkripsi : ROTL(byte, 3)
Dekripsi : ROTR(byte, 3)
```

## Narasi Siap Baca

> Pada BitShiftMix, yang digeser adalah bit di dalam setiap byte, bukan posisi byte pada matrix. Operasinya berupa rotate left. Jadi bit yang keluar dari kiri tidak dibuang, tetapi masuk lagi dari kanan. Jumlah rotasi tiap byte bisa berbeda, misalnya 3, 6, atau 1, karena dihitung dari round seed, posisi byte, dan nomor round. Saat decryption, rotate left dibalik dengan rotate right menggunakan jumlah yang sama.

---

## Versi Singkat

> BitShiftMix melakukan rotasi bit di dalam byte. Jumlah rotasinya berbeda per byte dan tetap bisa dibalik dengan rotasi arah sebaliknya.
