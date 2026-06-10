# Narasi Demo Web — Knight-Chaos Cipher

> File ini adalah panduan siap baca untuk mendemokan versi web KCC-128.
> Fokusnya: apa yang harus diisi, tombol yang diklik, dan narasi yang dibacakan.

---

## 1. Setup Awal

Buka file demo web:

```text
demo/index.html
```

Pastikan input berisi:

```text
Plaintext:
Ini adalah Pesan Rahasia
```

```text
Key:
kunci-rahasia-123
```

Jika sudah terisi default, tidak perlu diubah.

**Narasi:**

> Ini adalah versi web demo dari Knight-Chaos Cipher. Di kiri ada input plaintext dan key. Algoritma ini saya desain sebagai block cipher 128 bit, jadi setiap block berisi 16 byte dan divisualisasikan sebagai matrix 4×4. Prosesnya berjalan 10 round, dengan S-Box yang berubah tiap round dan permutation menggunakan pola langkah kuda.

---

## 2. Jelaskan Input Plaintext dan Key

**Yang ditunjukkan:**

- Field `Plaintext`
- Field `Key`

**Narasi:**

> Untuk contoh demo, saya memakai plaintext “Ini adalah Pesan Rahasia” dan key “kunci-rahasia-123”. Plaintext ini akan dikonversi menjadi byte, lalu diproses per block. Karena block size-nya 16 byte, pesan yang lebih panjang dari 16 byte akan dibagi menjadi beberapa block. Padding PKCS#7 dipakai agar panjang data menjadi kelipatan 16 byte.

---

## 3. Klik Encrypt & Trace

**Yang diklik:**

```text
Encrypt & Trace
```

**Yang ditunjukkan setelah klik:**

- `Ciphertext Hex`
- `Decryption Check`

**Narasi:**

> Sekarang saya klik Encrypt & Trace. Tombol ini menjalankan proses enkripsi sekaligus menyimpan trace tiap step, sehingga perubahan state bisa dilihat dari awal sampai menjadi ciphertext.
>
> Di sini ciphertext sudah terbentuk dalam format hexadecimal. Lalu ada decryption check. Status OK berarti ciphertext bisa didekripsi lagi menjadi plaintext awal, jadi proses encryption dan decryption pada implementasi ini konsisten.

---

## 4. Jelaskan State Matrix 4×4

**Yang ditunjukkan:**

- `State Matrix 4x4`
- Panel `OPERASI`
- Panel `PERUBAHAN`
- `BEFORE`
- `AFTER`

**Narasi:**

> Bagian tengah ini adalah state internal. Karena block size-nya 16 byte, state ditampilkan sebagai matrix 4×4. Setiap cell berisi satu byte dalam format hexadecimal. Jadi perubahan algoritma bisa dilihat secara visual, bukan hanya dari ciphertext akhir.
>
> Panel operasi menjelaskan step yang sedang aktif. Panel perubahan menunjukkan ringkasan transformasi. Bagian before dan after memperlihatkan nilai state sebelum dan sesudah operasi.

---

## 5. Step Initial

**Posisi:**

Biasanya setelah encrypt, tampilan berada di step `Initial`.

**Narasi:**

> Step pertama adalah Initial. Ini adalah plaintext block yang sudah dikonversi menjadi byte. Untuk block pertama, byte-byte ini mewakili bagian awal dari plaintext. Di sini belum ada proses enkripsi, baru representasi data sebagai state 4×4.

---

## 6. Klik Next ke CBC-XOR-IV

**Yang diklik:**

```text
Next
```

**Narasi:**

> Step berikutnya adalah CBC-XOR-IV. Pada mode CBC, block pertama di-XOR dengan IV. IV adalah Initialization Vector, yaitu nilai awal untuk proses chaining. Tujuannya memberi nilai awal pada block pertama sebelum masuk round enkripsi.
>
> Untuk block kedua dan seterusnya, yang dipakai bukan IV lagi, melainkan ciphertext dari block sebelumnya. XOR sendiri dibaca eks-or, dari Exclusive OR.

---

## 7. Klik Next ke AddRoundKey

**Yang diklik:**

```text
Next
```

**Yang ditunjukkan:**

- Panel `ROUND KEY` di kanan

**Narasi:**

> Ini adalah AddRoundKey. Pada step ini, state di-XOR dengan round key. Round key dihasilkan dari key utama melalui key schedule berbasis SHA-256. Jadi key utama tidak langsung dipakai mentah, tetapi diturunkan menjadi material key untuk setiap round.

---

## 8. Klik Next ke ChaoticSubBytes

**Yang diklik:**

```text
Next
```

**Narasi:**

> Step ini adalah ChaoticSubBytes. Setiap byte diganti menggunakan S-Box. Perbedaannya, S-Box di sini dibuat dinamis dari logistic chaotic map, sehingga setiap round bisa mempunyai tabel substitusi yang berbeda.
>
> Rumus logistic map dibaca: x n plus satu sama dengan r dikali x n dikali satu dikurangi x n. Karena S-Box ini berupa permutation byte 0 sampai 255, tabelnya bisa dibalik untuk proses decryption.

---

## 9. Klik Next ke KnightPermutation

**Yang diklik:**

```text
Next
```

**Yang ditunjukkan:**

- Panel `Knight Path / Permutasi Kuda`

**Narasi:**

> Ini bagian utama yang membedakan KCC-128, yaitu KnightPermutation. Pada step ini, nilai byte tidak diganti, tetapi posisinya dipindahkan mengikuti pola langkah kuda pada matrix 4×4.
>
> Langkah kuda berbentuk L, yaitu dua kotak ke satu arah dan satu kotak ke arah lain. Jalur permutasi ditentukan dari round seed, sehingga untuk key yang sama jalurnya deterministic.

---

## 10. Klik Next ke BitShiftMix

**Yang diklik:**

```text
Next
```

**Narasi:**

> Setelah posisi byte dipermutasi, masuk ke BitShiftMix. Di sini bit di dalam setiap byte dirotasi. Step ini membantu perubahan tidak hanya terjadi pada posisi byte, tetapi juga pada representasi bit di dalam byte tersebut.

---

## 11. Klik Next ke ByteDiffusion

**Yang diklik:**

```text
Next
```

**Narasi:**

> Selanjutnya adalah ByteDiffusion. Step ini menggunakan XOR chaining antar byte. Dengan cara ini, perubahan pada satu byte dapat memengaruhi byte-byte setelahnya. Tujuannya adalah mendukung diffusion atau penyebaran perubahan.

---

## 12. Klik Next ke FeistelMix

**Yang diklik:**

```text
Next
```

**Narasi:**

> Step terakhir dalam satu round adalah FeistelMix. Di sini byte dicampur secara berpasangan dalam beberapa pass. Struktur seperti ini membantu proses mixing tetap invertible, sehingga masih bisa dibalik saat decryption.

---

## 13. Klik Play untuk Menjalankan Round Berikutnya

Setelah satu round dijelaskan manual, lanjutkan dengan tombol:

```text
Play
```

**Narasi:**

> Setelah satu round dijelaskan step-by-step, saya jalankan Play untuk memperlihatkan bahwa pola transformasi ini diulang sampai 10 round. Jadi setiap round memiliki struktur yang sama, tetapi material round seperti round key, S-Box, dan permutation route dapat berbeda.

---

## 14. Jelaskan Block Select

Karena plaintext lebih dari 16 byte, akan ada lebih dari satu block.

**Yang dilakukan:**

- Klik dropdown `Blok 1`
- Pilih `Blok 2` jika tersedia

**Narasi:**

> Karena pesan ini lebih panjang dari satu block, demo membaginya menjadi beberapa block. Block pertama berisi 16 byte awal, lalu block berikutnya berisi sisa pesan ditambah padding. Dengan mode CBC, block berikutnya dipengaruhi oleh ciphertext block sebelumnya.

---

## 15. Jelaskan Assembly / Concat

**Yang ditunjukkan:**

- Bagian `Assembly / Concat Blok → Ciphertext`
- `Ciphertext Final`

**Narasi:**

> Di bagian assembly, setiap ciphertext block digabungkan menjadi ciphertext final. Jadi ciphertext akhir adalah hasil concat dari semua block yang sudah dienkripsi.

---

## 16. Jelaskan Security Analysis

**Yang ditunjukkan:**

- `Plaintext Entropy`
- `Ciphertext Entropy`
- `Avalanche Effect`
- `Top Byte Frequency`

**Narasi:**

> Di bagian analisis, entropy plaintext sekitar 3.23 bit per byte. Setelah enkripsi, entropy ciphertext naik menjadi sekitar 4.94 bit per byte pada sample ini. Ini memberi indikasi bahwa distribusi byte ciphertext lebih tersebar dibanding plaintext.
>
> Avalanche effect sekitar 50 persen. Artinya, saat satu bit input diubah, sekitar setengah bit pada ciphertext ikut berubah pada pengujian ini. Ini masih analisis awal berbasis sample kecil, sehingga belum saya posisikan sebagai evaluasi keamanan formal.

---

## 17. Demo Decrypt / Uji Ciphertext

**Yang ditunjukkan:**

- Bagian `Decrypt / Uji Ciphertext`

**Yang diklik:**

```text
Decrypt Hex
```

**Narasi:**

> Sekarang saya uji decryption dari ciphertext hex. Dengan key yang sama, ciphertext ini harus bisa kembali menjadi plaintext awal.
>
> Hasilnya kembali menjadi “Ini adalah Pesan Rahasia”. Ini menunjukkan bahwa proses enkripsi dan dekripsi pada implementasi ini berjalan konsisten.

---

# Narasi Full Siap Baca

> Saya akan mendemokan versi web dari Knight-Chaos Cipher. Di sini plaintext yang saya pakai adalah “Ini adalah Pesan Rahasia”, dan key-nya “kunci-rahasia-123”. Algoritma ini adalah block cipher 128 bit, sehingga setiap block terdiri dari 16 byte dan ditampilkan sebagai matrix 4×4.
>
> Sekarang saya klik Encrypt & Trace. Setelah proses berjalan, muncul ciphertext dalam bentuk hexadecimal dan decryption check bernilai OK. Artinya ciphertext bisa dikembalikan lagi menjadi plaintext awal.
>
> Di bagian tengah, kita bisa melihat state internal. Setiap cell adalah satu byte. Step pertama adalah Initial, yaitu plaintext yang sudah dikonversi menjadi byte. Lalu masuk ke CBC-XOR-IV. IV adalah Initialization Vector, nilai awal yang di-XOR dengan block pertama pada mode CBC. XOR sendiri dibaca eks-or, dari Exclusive OR.
>
> Setelah itu masuk ke AddRoundKey, yaitu state di-XOR dengan round key. Round key ini diturunkan dari key utama menggunakan SHA-256. Lalu masuk ke ChaoticSubBytes, yaitu substitusi byte menggunakan S-Box dinamis. S-Box ini dibuat dari logistic chaotic map dengan rumus x n plus satu sama dengan r dikali x n dikali satu dikurangi x n.
>
> Berikutnya adalah KnightPermutation. Ini bagian khas dari algoritma saya. Byte tidak diubah nilainya, tetapi posisinya dipindahkan mengikuti pola langkah kuda berbentuk L pada matrix 4×4. Jalurnya ditentukan dari round seed, sehingga untuk key yang sama hasilnya deterministic.
>
> Setelah permutation, ada BitShiftMix untuk rotasi bit di dalam byte, ByteDiffusion untuk XOR chaining antar byte, dan FeistelMix untuk mixing berpasangan. Semua step ini dirancang agar tetap invertible, sehingga proses decryption masih bisa dilakukan.
>
> Karena plaintext lebih panjang dari 16 byte, pesan dibagi menjadi beberapa block. Pada mode CBC, block berikutnya di-XOR dengan ciphertext block sebelumnya, sehingga setiap block punya hubungan dengan block sebelumnya. Di bagian assembly, semua ciphertext block digabung menjadi ciphertext final.
>
> Terakhir, di bagian Security Analysis, entropy plaintext sekitar 3.23 bit per byte dan ciphertext naik menjadi sekitar 4.94 bit per byte pada sample ini. Avalanche effect sekitar 50 persen, artinya perubahan satu bit input menyebabkan sekitar setengah bit ciphertext berubah pada pengujian ini. Ini adalah analisis awal, sehingga belum saya posisikan sebagai evaluasi keamanan formal, tetapi cukup menunjukkan bahwa rancangan dan implementasi berjalan sesuai tujuan tugas.

---

# Tips Saat Menjelaskan

Gunakan istilah berikut agar penjelasan terdengar lebih teknis dan terarah:

1. **State internal** — data sementara yang diproses di dalam cipher.
2. **Invertible** — operasi bisa dibalik agar decryption berhasil.
3. **Deterministic untuk key yang sama** — hasil bisa direproduksi jika plaintext dan key sama.
4. **Analisis awal** — hasil metrik masih berbasis sample, belum evaluasi keamanan formal.
5. **Substitution, permutation, diffusion** — tiga konsep utama yang perlu sering disebut.

Kalimat ringkas yang bisa dipakai:

> Intinya, KCC-128 ini menggabungkan substitution dari chaotic S-Box, permutation dari langkah kuda, dan diffusion dari XOR chaining serta Feistel-style mixing.
