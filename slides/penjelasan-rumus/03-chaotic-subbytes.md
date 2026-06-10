# Penjelasan Rumus — ChaoticSubBytes

## Rumus Logistic Chaotic Map

```text
x(n+1) = r * x(n) * (1 - x(n))
```

## Rumus Substitusi Byte

```text
output[i] = SBox[state[i]]
```

Untuk decryption:

```text
state[i] = inverseSBox[output[i]]
```

## Cara Membaca Rumus

Rumus chaotic map dibaca:

> x n plus satu sama dengan r dikali x n dikali satu dikurangi x n.

Rumus substitusi dibaca:

> Output pada posisi i sama dengan nilai S-Box dari byte state pada posisi i.

## Maksudnya

ChaoticSubBytes adalah tahap **substitution**. Setiap byte diganti dengan byte lain berdasarkan tabel S-Box.

Bedanya dengan S-Box tetap, pada KCC-128 S-Box dibuat secara dinamis untuk tiap round menggunakan logistic chaotic map.

Secara garis besar:

1. `roundSeed` dipakai untuk menentukan nilai awal `x` dan parameter `r`.
2. Rumus logistic map diiterasi berkali-kali.
3. Output chaotic dipakai untuk mengurutkan byte `0..255`.
4. Hasil urutan menjadi S-Box.
5. Karena hasilnya permutation, inverse S-Box bisa dibuat untuk decryption.

## Kenapa Bisa Didekripsi?

S-Box yang dibuat adalah permutation dari angka 0 sampai 255.

Artinya:

- setiap input byte punya satu output byte,
- tidak ada output yang dobel,
- sehingga tabel inverse bisa dibuat.

## Narasi Siap Baca

> Pada step ChaoticSubBytes, setiap byte diganti menggunakan S-Box dinamis. S-Box ini dibuat dari logistic chaotic map dengan rumus x n plus satu sama dengan r dikali x n dikali satu dikurangi x n. Deret chaotic yang dihasilkan dipakai untuk membentuk permutation byte 0 sampai 255. Karena S-Box berbentuk permutation, tabel ini bisa dibalik untuk proses decryption.

---

## Versi Singkat

> ChaoticSubBytes mengganti setiap byte menggunakan S-Box yang dibuat dari logistic chaotic map, dan S-Box tersebut bisa dibalik karena berbentuk permutation.
