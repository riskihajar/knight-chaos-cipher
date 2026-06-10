# Penjelasan Rumus — ByteDiffusion

## Rumus

```text
output[i] = value XOR carry XOR neighbor XOR keyMix
```

Dalam implementasi:

```text
output[i] = state[i] XOR carry XOR neighbor XOR ((roundKey[i] + i * 13) & 0xFF)
```

Dengan:

```text
carry awal    = roundKey[0]
neighbor awal = roundKey[-1]
neighbor      = output[i - 1], untuk i > 0
carry         = output[i], setelah output i dihitung
```

## Cara Membaca Rumus

> Output pada posisi i sama dengan byte input posisi i, di-XOR dengan carry, di-XOR dengan neighbor, lalu di-XOR dengan campuran round key.

## Maksudnya

ByteDiffusion adalah tahap untuk membuat perubahan satu byte menyebar ke byte-byte setelahnya.

Jika output sebelumnya ikut dipakai untuk menghitung output berikutnya, maka perubahan pada byte awal dapat merambat ke byte berikutnya.

Secara konsep:

```text
output[0] memengaruhi output[1]
output[1] memengaruhi output[2]
output[2] memengaruhi output[3]
...
```

Efeknya seperti rantai.

## Komponen Rumus

### 1. `state[i]`

Byte input pada posisi saat ini.

### 2. `carry`

Nilai pembawa dari hasil sebelumnya.

Awalnya berasal dari round key:

```text
carry = roundKey[0]
```

Setelah output dihitung:

```text
carry = output[i]
```

### 3. `neighbor`

Byte output sebelumnya.

Untuk byte pertama, karena belum ada output sebelumnya, dipakai byte terakhir round key:

```text
neighbor = roundKey[-1]
```

Untuk byte kedua dan seterusnya:

```text
neighbor = output[i - 1]
```

### 4. `keyMix`

Campuran round key dan posisi byte:

```text
keyMix = (roundKey[i] + i * 13) & 0xFF
```

`& 0xFF` memastikan hasil tetap berada dalam ukuran 1 byte, yaitu 0 sampai 255.

## Kenapa Bisa Didekripsi?

Karena operasi utamanya adalah XOR.

Sifat XOR:

```text
A XOR B XOR B = A
```

Jadi rumus yang sama bisa dipakai untuk mengambil kembali input awal, asalkan carry, neighbor, dan keyMix diketahui dalam urutan yang benar.

## Narasi Siap Baca

> ByteDiffusion adalah step untuk menyebarkan perubahan antar byte. Setiap output byte dihitung dari byte input saat ini, carry dari hasil sebelumnya, neighbor atau byte sebelumnya, dan campuran round key. Karena output sebelumnya ikut dipakai untuk menghitung byte berikutnya, perubahan pada satu byte bisa menyebar ke posisi setelahnya seperti efek rantai. Operasi utamanya memakai XOR, sehingga tetap bisa dibalik saat decryption.

---

## Versi Singkat

> ByteDiffusion membuat byte saling memengaruhi. Output sebelumnya dipakai untuk menghitung output berikutnya, sehingga perubahan menyebar sepanjang block.
