# Tugas 3 Cyber Security - Knight-Chaos Cipher

**Nama:** Muhammad Rizky Hajar  
**NIM:** 24.55.2714  
**Program Studi:** PJJ Informatika  
**Konsentrasi:** Big Data dan Predictive Analytics (BDPA)  
**Mata Kuliah:** Cyber Security

## Ringkasan

Folder ini berisi rancangan, implementasi, analisis, dan demo interaktif algoritma kriptografi baru bernama **Knight-Chaos Cipher (KCC-128)**. Algoritma ini memodifikasi komponen utama cipher melalui:

- Dynamic S-Box berbasis logistic chaotic map (berubah per round).
- Byte permutation berbasis knight's tour pada board 4×4.
- Key schedule yang mengubah round key, S-Box, knight path, bit rotation, dan diffusion.
- Demo interaktif dengan hitung manual per byte dan multi-block visualization.

## Cara Menjalankan Demo Python

```bash
python3 src/demo.py
```

Untuk menyimpan bukti sample run:

```bash
python3 src/demo.py --sample-run sample-run.txt
```

## Cara Membuka Demo Interaktif

Buka file berikut di browser:

```text
demo/index.html
```

Fitur demo:
- Block selector (dropdown) untuk melihat proses per block.
- Matrix 4×4 — klik cell untuk melihat hitung manual byte tersebut.
- Detail panel: XOR biner, S-Box lookup, rotation, diffusion per byte.
- Assembly view: visualisasi concat block → ciphertext final.
- Timeline navigation step-by-step per round.

## Cara Generate Excel Walkthrough

```bash
python3 src/export_excel.py
```

Menghasilkan `excel/kcc128-walkthrough.xlsx` dan `.csv` berisi state per step untuk semua 10 round.

## Isi Deliverable

- `src/knight_chaos_cipher.py`: source code utama.
- `src/demo.py`: demo CLI dan analisis.
- `src/export_excel.py`: export round-by-round state ke Excel/CSV.
- `demo/index.html`: demo interaktif web.
- `excel/`: Excel walkthrough dan cheat sheet penjelasan manual.
- `pseudocode.md`: pseudocode encryption dan decryption.
- `makalah-knight-chaos-cipher.md`: naskah makalah.
- `sample-run.txt`: bukti encryption/decryption berhasil.
- `slides/`: file presentasi.
- `docs/`: dokumen DOCX/PDF.
- `assets/demo-screenshot.png`: screenshot demo interaktif.
