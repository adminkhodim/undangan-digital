# 💍 Undangan Digital Pernikahan (Modern Elegant Champagne & Gold)

Landing page website undangan pernikahan digital interaktif dengan desain **Modern Elegant**, responsif mobile-first, kaya fitur, dan sangat mudah dikustomisasi.

---

## ✨ Fitur-Fitur Utama

1. **Portal Editor & Admin Dashboard Khusus (`/admin.html`)**:
   - Tampilan visual untuk mengedit seluruh konten undangan tanpa perlu menyentuh kode.
   - Form data mempelai pria & wanita, kutipan ayat, rangkaian acara, kisah cinta, galeri foto, amplop digital, dan pengaturan musik.
   - Tombol **"Simpan Perubahan"** yang langsung memperbarui file [`config.js`](file:///c:/Users/pc/Documents/APP/undangan_digital/config.js) dan sistem peramban.
   - **Generator Tautan Tamu & WhatsApp Blast**: Masukkan nama tamu, otomatis membuat tautan unik dan teks pesan WhatsApp yang santun, siap dikirimkan dengan satu klik!
   - **Manajemen Buku Tamu & RSVP**: Melihat daftar ucapan yang masuk, memantau jumlah kehadiran (Hadir, Ragu, Tidak Hadir), ekspor data, dan moderasi pesan.

2. **Cover Amplop Interaktif (Personalized Guest Greeting)**:
   - Menampilkan salam personal kepada tamu: *"Kepada Yth. Bapak/Ibu/Saudara/i: [Nama Tamu]"*.
   - Personalisasi dinamis lewat URL parameter: `?to=Nama+Tamu` (contoh: `index.html?to=Bpk.+Dimas+Setiawan+%26+Partner`).
   - Tombol **"Buka Undangan"** dengan animasi transisi halus.

2. **Musik Latar (Background Music) & Fallback Ambient Piano**:
   - Otomatis mulai berputar saat tamu menekan tombol "Buka Undangan".
   - Tombol *floating music disc* dengan animasi piringan hitam berputar & kontrol Play / Pause.
   - Dilengkapi *built-in* **Web Audio API Ambient Romantic Piano Synthesizer** (chords Canon in D) sehingga musik tetap dapat berbunyi merdu meski tanpa file mp3 eksternal.

3. **Hitung Mundur (Live Countdown Timer) & Add to Google Calendar**:
   - Menghitung mundur Hari, Jam, Menit, dan Detik secara realtime menuju akad/resepsi.
   - Tombol langsung untuk menyimpan agenda ke **Google Calendar** tamu.

4. **Profil Mempelai (The Bride & The Groom)**:
   - Frame arsitektur *arch/dome* mewah dengan foto mempelai pria & wanita beresolusi tinggi.
   - Detail nama lengkap, gelar, urutan putra/putri, nama orang tua, kutipan bio, dan link Instagram.

5. **Kutipan Suci / Romantis**:
   - Teks kaligrafi Arab QS. Ar-Rum ayat 21 beserta terjemahan bahasa Indonesia yang menyejukkan.

6. **Rangkaian Acara & Peta Interaktif**:
   - Jadwal Akad Nikah & Resepsi Pernikahan.
   - Tombol *Lihat Denah Lokasi* untuk membuka embed peta langsung di dalam halaman.
   - Tombol langsung menuju navigasi arah **Google Maps**.

7. **Kisah Cinta (Love Story Timeline)**:
   - Alur perjalanan cinta dari pertama kali bertemu, komitmen, lamaran, hingga hari pernikahan.

8. **Galeri Foto & Lightbox Modal**:
   - Galeri foto estetik.
   - Klik pada foto untuk memperbesar tampilan (*lightbox viewer*) dengan keterangan foto.

9. **Amplop Digital (Cashless Gift & Rekening Bank)**:
   - Kartu rekening Bank BCA, Bank Mandiri, atau dompet digital lainnya.
   - Tombol **"Salin No. Rekening"** otomatis dengan notifikasi toast *"Berhasil disalin ke papan klip!"*.
   - Alamat pengiriman kado fisik dengan tombol salin alamat lengkap.

10. **RSVP & Buku Tamu / Doa Restu (Interactive Guestbook)**:
    - Form konfirmasi kehadiran (*Hadir*, *Ragu-ragu*, *Tidak Hadir*) dan doa restu.
    - Tersimpan langsung di peramban (`localStorage`) dengan tampilan avatar inisial, badge kehadiran, dan waktu pengiriman.

11. **Floating Navigation Dock**:
    - Menu pintas melayang di bagian bawah layar smartphone (Home, Mempelai, Acara, Cerita, Galeri, Kado, Ucapan) dengan fitur *Scroll-Spy* otomatis aktif sesuai posisi layar.

---

## 📁 Struktur Berkas

```
undangan_digital/
├── index.html           # Struktur halaman utama & OpenGraph meta tags
├── config.js            # [PENTING] Seluruh data undangan dapat diubah di sini
├── README.md            # Dokumentasi & panduan penggunaan
├── css/
│   └── style.css        # Desain warna champagne & gold, tipografi, & animasi
├── js/
│   └── app.js           # Logika interaktif, musik, countdown, rsvp, & toast
└── assets/
    ├── audio/           # File musik mp3 (opsional)
    └── images/          # Foto mempelai & galeri
        ├── couple_hero.jpg
        ├── groom.jpg
        └── bride.jpg
```

---

## 🛠️ Cara Mengubah Data Undangan

Anda **tidak perlu mengedit kode HTML yang rumit**! Cukup buka file [`config.js`](file:///c:/Users/pc/Documents/APP/undangan_digital/config.js) menggunakan teks editor:

1. **Ubah Nama & Data Mempelai**:
   - Edit bagian `couple.groom` dan `couple.bride`.
2. **Ubah Tanggal Hitung Mundur**:
   - Edit `targetDate: "2026-12-20T08:00:00"`.
3. **Ubah Jadwal & Lokasi Acara**:
   - Edit array `events`.
4. **Ubah Nomor Rekening**:
   - Edit array `gifts.bankAccounts`.
5. **Ganti Foto**:
   - Ganti file di folder `assets/images/` atau ubah tautan URL di `gallery`.

---

## 🔗 Cara Membuat Tautan Khusus Nama Tamu

Untuk mengirim undangan ke WhatsApp tamu dengan nama yang tertera di cover:

- **Format**: `https://alamat-website-anda.com/?to=Nama+Tamu`
- **Contoh 1**: `?to=Bpk.+Budi+Santoso`
- **Contoh 2**: `?to=Sahabat+Kecilku+Rian`
- **Contoh 3**: `?to=Keluarga+Besar+Bpk.+Hendrawan`

---

## 🚀 Cara Menjalankan Secara Lokal

1. Buka file [`index.html`](file:///c:/Users/pc/Documents/APP/undangan_digital/index.html) langsung dengan klik ganda di peramban (Chrome, Edge, Safari), **atau**
2. Jalankan server lokal melalui terminal:
   ```bash
   npx serve -l 3000
   ```
   Lalu buka `http://localhost:3000` di peramban Anda.
