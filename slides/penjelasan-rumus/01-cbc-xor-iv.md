# Penjelasan Rumus — CBC-XOR-IV

## Rumus

Untuk block pertama:

```text
state0 = plaintextBlock0 XOR IV
```

Untuk block berikutnya:

```text
stateN = plaintextBlockN XOR ciphertextBlockN-1
```

IV dihitung dari key:

```text
masterSeed = SHA256(key)
IV = SHA256(masterSeed || "KCC-IV")[0:16]
```

atau ditulis singkat:

```text
IV = SHA256(SHA256(key) || "KCC-IV")[0:16]
```

## Cara Membaca Rumus

> State awal block pertama sama dengan plaintext block pertama di-XOR dengan IV.

Untuk IV:

> IV sama dengan 16 byte pertama dari SHA-256 hasil gabungan SHA-256 key dengan string KCC-IV.

Simbol `||` berarti **concatenate** atau **penggabungan data**, bukan OR dan bukan XOR.

## Maksudnya

CBC adalah **Cipher Block Chaining**. Intinya, setiap block dibuat bergantung pada nilai sebelumnya.

- Block pertama memakai `IV` karena belum ada ciphertext sebelumnya.
- Block kedua dan seterusnya memakai ciphertext dari block sebelumnya.

Dengan cara ini, dua block plaintext yang sama tidak langsung menghasilkan state awal yang sama, karena ada chaining.

## Catatan Tentang IV

IV adalah **Initialization Vector**, yaitu nilai awal untuk block pertama.

Pada implementasi ini, IV dibuat secara deterministic dari key:

```text
IV = SHA256(SHA256(key) || "KCC-IV")[0:16]
```

Artinya, jika key sama, IV juga sama. Ini cukup untuk demo rancangan, tetapi pada sistem kriptografi nyata IV idealnya random atau unik per pesan.

## Narasi Siap Baca

> Pada step CBC-XOR-IV, plaintext block pertama dicampur dengan IV menggunakan XOR. IV adalah Initialization Vector, yaitu nilai awal untuk proses CBC. Rumusnya, state awal sama dengan plaintext block di-XOR dengan IV. Untuk block kedua dan seterusnya, IV diganti dengan ciphertext block sebelumnya. Jadi setiap block punya hubungan dengan block sebelumnya.

---

## Versi Singkat

> CBC-XOR-IV adalah tahap awal chaining. Block pertama di-XOR dengan IV, sedangkan block berikutnya di-XOR dengan ciphertext block sebelumnya.
