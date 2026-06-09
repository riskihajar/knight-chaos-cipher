# Narasi Presentasi — Knight-Chaos Cipher

> File ini adalah script siap baca saat presentasi. Satu section = satu slide.
> Sinkron dengan hasil generate 13 slide dari `slides-knight-chaos-cipher.md`.

---

## Slide 1: Judul

Assalamu'alaikum warahmatullahi wabarakatuh. Perkenalkan, saya Muhammad Rizky Hajar dengan NIM 24.55.2714. Pada presentasi ini saya akan menjelaskan algoritma kriptografi yang saya rancang, yaitu **Knight-Chaos Cipher**, atau **KCC-128**. Algoritma ini menggabungkan konsep langkah kuda pada permainan catur dengan chaotic map dari matematika.

---

## Slide 2: Latar Belakang

Latar belakang dari tugas ini adalah merancang algoritma kriptografi baru. Fokusnya mencakup pembuatan program enkripsi dan dekripsi, sekaligus eksperimen pada beberapa komponen utama cipher agar punya karakteristik sendiri. Di sini saya menggabungkan game logic, yaitu langkah kuda catur, dengan chaotic map untuk membangun proses substitution dan permutation. Target akhirnya adalah prototype algoritma yang bisa melakukan encryption, decryption, demo, dan analisis awal sederhana.

---

## Slide 3: Ide Utama

Ide utama algoritma ini adalah membuat block cipher 128 bit, sehingga setiap block berisi 16 byte. Enam belas byte ini saya representasikan sebagai board 4×4, mirip papan kecil yang bisa dipakai untuk pola langkah kuda. Algoritma berjalan selama 10 round. Untuk bagian substitution, S-Box dibuat secara dinamis menggunakan logistic chaotic map. Untuk bagian permutation, posisi byte dipindahkan menggunakan pola knight's tour atau langkah kuda.

---

## Slide 4: Pembeda dari Cipher Umum

Kalau dibandingkan dengan cipher umum seperti AES, ada beberapa perbedaan desain. AES menggunakan S-Box yang tetap, sedangkan KCC-128 mencoba menggunakan S-Box dinamis yang berubah setiap round. AES memakai ShiftRows yang polanya linear, sedangkan KCC-128 memakai knight's tour yang perpindahannya non-linear dan berbentuk L. Selain itu, key schedule di KCC-128 dipakai untuk menghasilkan round key sekaligus menentukan S-Box, route permutation, rotation, dan diffusion.

---

## Slide 5: Arsitektur Round

Dalam setiap round ada 6 step utama. Pertama, **AddRoundKey**, yaitu state di-XOR dengan round key. Kedua, **ChaoticSubBytes**, yaitu setiap byte diganti menggunakan dynamic S-Box. Ketiga, **KnightPermutation**, yaitu posisi byte diubah mengikuti jalur langkah kuda. Keempat, **BitShiftMix**, yaitu bit di dalam setiap byte dirotasi. Kelima, **ByteDiffusion**, yaitu XOR chaining antar byte agar perubahan bisa menyebar. Keenam, **FeistelMix**, yaitu mixing berpasangan sebanyak 3 pass untuk membantu proses diffusion.

---

## Slide 6: Dynamic S-Box

Pada bagian S-Box, saya menggunakan logistic chaotic map dengan rumus **x n plus satu sama dengan r dikali x n dikali satu dikurangi x n**. Nilai awal x diambil dari round seed, dan parameter r berubah setiap round. Output chaotic map menghasilkan deret angka yang deterministic tapi terlihat acak. Deret ini digunakan untuk mengurutkan nilai byte 0 sampai 255. Hasilnya menjadi S-Box yang invertible, sehingga bisa dibalik lagi saat proses decryption.

---

## Slide 7: Knight Permutation

Pada bagian permutation, setiap block 16 byte dipetakan ke board 4×4. Setelah itu posisi byte di-shuffle mengikuti langkah kuda, yaitu gerakan berbentuk L: dua kotak ke satu arah dan satu kotak ke arah lain. Starting position ditentukan oleh round seed. Untuk memilih langkah berikutnya, saya menggunakan Warnsdorff's heuristic, yaitu memilih posisi dengan jumlah langkah lanjutan paling sedikit. Jika ada nilai seri, round seed dipakai sebagai tie-breaking.

---

## Slide 8: Diffusion dan Chaining

Bagian diffusion bertujuan membantu perubahan kecil pada plaintext menyebar ke bagian lain pada ciphertext. **BitShiftMix** melakukan rotasi bit di dalam byte. **ByteDiffusion** memakai XOR chaining, sehingga jika satu byte berubah, byte setelahnya dapat ikut terpengaruh. **FeistelMix** menambahkan mixing berpasangan sebanyak 3 pass untuk mendukung avalanche effect. Untuk pesan multi-block, saya menggunakan mode CBC, sehingga block berikutnya di-XOR dengan ciphertext block sebelumnya. Semua operasi dibuat invertible agar decryption tetap bisa dilakukan.

---

## Slide 9: Tech Stack

Secara teknis, algoritma yang dibuat bernama KCC-128 dan termasuk block cipher. Block size-nya 128 bit atau 16 byte, yang direpresentasikan sebagai matrix 4×4. Jumlah round-nya 10. S-Box dibuat menggunakan logistic chaotic map secara dinamis per round. Permutation menggunakan knight's tour dengan Warnsdorff's heuristic. Mode operasinya CBC, key schedule menggunakan SHA-256, dan padding menggunakan PKCS#7.

---

## Slide 10: Hasil Sample Run

Untuk sample run, saya menggunakan plaintext **"Ini adalah Pesan Rahasia"** dan key **"kunci-rahasia-123"**. Hasil decryption berhasil, artinya plaintext bisa kembali utuh setelah dienkripsi dan didekripsi. Dari evaluasi pada sample ini, entropy plaintext sekitar **3.23 bit per byte**, sedangkan entropy ciphertext naik menjadi sekitar **4.94 bit per byte**. Avalanche effect yang didapat adalah sekitar **50 persen**, artinya ketika 1 bit input diubah, sekitar setengah bit pada ciphertext ikut berubah pada pengujian ini.

---

## Slide 11: Analisis Keamanan

Dari sisi analisis awal, entropy meningkat dari 3.23 menjadi 4.94 bit per byte pada sample yang diuji. Ini memberi indikasi bahwa distribusi byte ciphertext lebih tersebar dibanding plaintext. Avalanche effect sekitar 50 persen juga menjadi indikasi awal bahwa proses diffusion berjalan sesuai tujuan pada sample ini. Frequency analysis sederhana menunjukkan sebaran byte ciphertext yang cukup tersebar pada sample. Dibanding Caesar atau Vigenere, pendekatan KCC-128 mencoba mengurangi hubungan langsung antara plaintext dan ciphertext melalui S-Box non-linear, permutation, dan diffusion.

---

## Slide 12: Keterbatasan

Algoritma ini masih punya beberapa keterbatasan. Pertama, IV masih di-derive secara deterministic dari key, padahal idealnya IV dibuat random. Kedua, belum ada mekanisme MAC atau HMAC, jadi rancangan ini fokus pada confidentiality dan belum mencakup integrity. Ketiga, kualitas S-Box seperti nonlinearity dan differential uniformity belum diuji secara formal. Keempat, pengujian masih perlu diperluas menggunakan dataset yang lebih besar.

---

## Slide 13: Kesimpulan

Kesimpulannya, KCC-128 adalah rancangan block cipher eksperimental yang memodifikasi beberapa komponen utama, yaitu substitution, permutation, diffusion, dan key schedule. Knight's tour digunakan sebagai permutation yang non-linear dan berbasis game logic. Chaotic map digunakan sebagai generator S-Box yang dinamis setiap round. Dari hasil implementasi, proses encryption dan decryption berjalan benar, dan pada sample pengujian avalanche effect berada di sekitar 50 persen. Jadi rancangan ini sudah cukup untuk menunjukkan konsep cipher baru beserta demo dan analisis awal, meskipun masih membutuhkan pengujian formal yang lebih luas.

---

## Kalau Ada Pertanyaan

**"IV itu apa?"**
→ IV adalah **Initialization Vector**, yaitu nilai awal 16 byte yang di-XOR ke block pertama pada mode CBC. Tujuannya memberi nilai awal pada proses chaining.

**"XOR dibaca apa?"**
→ XOR biasanya dibaca **eks-or**, dari **Exclusive OR**. Boleh juga dieja **X-O-R**.

**"XOR itu apa?"**
→ Operasi bit: kalau dua bit sama hasilnya 0, kalau berbeda hasilnya 1. Sifat pentingnya reversible: A XOR B XOR B akan kembali menjadi A.

**"Rumus logistic map dibaca bagaimana?"**
→ Dibaca: **x n plus satu sama dengan r dikali x n dikali satu dikurangi x n**.

**"S-Box cara kerjanya gimana?"**
→ S-Box adalah tabel lookup. Misalnya input byte tertentu masuk, lalu diganti dengan byte lain berdasarkan tabel. Pada KCC-128 tabelnya berubah setiap round.

**"Round key dari mana?"**
→ Master seed dibuat dari SHA-256 key. Dari master seed dibuat round seed untuk setiap round, lalu round seed dipakai untuk menghasilkan round key dan parameter lain.

**"Kenapa menggunakan langkah kuda?"**
→ Karena langkah kuda berpindah secara non-linear dengan bentuk L, sehingga menarik untuk dicoba sebagai pola permutation byte pada matrix 4×4.

**"Bedanya dengan AES?"**
→ AES memakai S-Box tetap dan ShiftRows linear. KCC-128 mencoba memakai S-Box dinamis dari chaotic map dan permutation non-linear dari langkah kuda. Jadi poin utamanya ada pada perbedaan pendekatan desain antara keduanya.
