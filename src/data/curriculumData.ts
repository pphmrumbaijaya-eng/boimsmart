export interface SubjectItem {
  id: string;
  name: string;
  topics: string[];
  defaultObjectives: string[];
}

export interface CurriculumLevel {
  id: string;
  name: string;
  category: 'Kurikulum Merdeka' | 'Kurikulum 2013 (K13)';
  gradeGroup: string;
  subjects: SubjectItem[];
}

// Mata Pelajaran Keagamaan Madrasah, Bahasa & Muatan Lokal Tambahan
export const ADDITIONAL_SUBJECTS: SubjectItem[] = [
  {
    id: 'b-arab',
    name: 'Bahasa Arab',
    topics: ['Mufradat & Kosakata Terapan', 'Tarkib (Tata Bahasa Arab)', 'Qira\'ah (Pemahaman Bacaan)', 'Hiwar (Percakapan Sehari-hari)'],
    defaultObjectives: ['Peserta didik mampu memahami teks dan kaidah tata bahasa Arab secara tepat.'],
  },
  {
    id: 'quran-hadist',
    name: 'Al-Qur\'an Hadits',
    topics: ['Kandungan Ayat-Ayat Pilihan', 'Kaidah Ilmu Tajwid & Hukum Bacaan', 'Hadits tentang Kejujuran & Akhlak', 'Hadits tentang Menuntut Ilmu & Toleransi'],
    defaultObjectives: ['Peserta didik mampu menganalisis kandungan ayat suci Al-Qur\'an dan hadits shahih serta menerapkan hukum bacaan tajwid.'],
  },
  {
    id: 'ski',
    name: 'Sejarah Kebudayaan Islam (SKI)',
    topics: ['Dakwah Rasulullah di Makkah & Madinah', 'Kepemimpinan Khulafaur Rasyidin', 'Peradaban Islam Masa Daulah', 'Sejarah Masuknya Islam di Nusantara & Walisongo'],
    defaultObjectives: ['Peserta didik mampu meneladani sejarah perjuangan dakwah Islam serta kontribusi peradaban Islam di Nusantara.'],
  },
  {
    id: 'fikih',
    name: 'Fikih',
    topics: ['Thaharah & Ibadah Shalat Fardhu/Sunnah', 'Zakat, Infak, Sedekah & Puasa', 'Haji dan Umrah', 'Muamalah & Transaksi Ekonomi Syariah', 'Kaidah Halal, Haram & Makanan Sehat'],
    defaultObjectives: ['Peserta didik memahami dan menerapkan ketentuan syariat fikih ibadah serta muamalah sehari-hari.'],
  },
  {
    id: 'akidah-akhlak',
    name: 'Akidah Akhlak',
    topics: ['Rukun Iman & Asmaul Husna', 'Akhlak Terpuji kepada Orang Tua dan Guru', 'Menghindari Akhlak Tercela (Mazmumah)', 'Adab Bermedia Sosial & Bergaul'],
    defaultObjectives: ['Peserta didik memperkokoh aqidah tauhid serta menampilkan budi pekerti akhlakul karimah.'],
  },
  {
    id: 'bmr',
    name: 'Budaya Melayu Riau (BMR)',
    topics: ['Tunjuk Ajar & Pantun Melayu', 'Aksara & Tulisan Arab-Melayu (Pegon)', 'Adab Resam & Upacara Adat Melayu Riau', 'Kearifan Ekologi Hutan Tanah Melayu', 'Seni Musik, Tari & Busana Adat Melayu'],
    defaultObjectives: ['Peserta didik melestarikan kearifan lokal, aksara Arab-Melayu, serta nilai luhur adat istiadat Budaya Melayu Riau.'],
  },
  {
    id: 'pai-bp',
    name: 'Pendidikan Agama Islam (PAI) & Budi Pekerti',
    topics: ['Meneladani Asmaul Husna', 'Membangun Perilaku Jujur & Amanah', 'Tata Cara Shalat & Zakat', 'Toleransi dan Moderasi Beragama'],
    defaultObjectives: ['Peserta didik mengamalkan ajaran agama Islam secara moderat, inklusif, dan berakhlak mulia.'],
  },
  {
    id: 'pjok-gen',
    name: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
    topics: ['Permainan Bola Besar & Bola Kecil', 'Aktivitas Atletik & Senam Lantai', 'Kebugaran Jasmani', 'Pencegahan Penyakit & Pola Hidup Sehat'],
    defaultObjectives: ['Peserta didik mempraktikkan keterampilan gerak olahraga serta membiasakan pola hidup bugar dan sehat.'],
  },
  {
    id: 'seni-prakarya-gen',
    name: 'Seni Budaya & Prakarya (SBdP / PKWU)',
    topics: ['Seni Rupa Murni & Terapan', 'Seni Musik Tradisional Nusantara', 'Seni Tari Kreasi Daerah', 'Kewirausahaan Produk Kerajinan & Olahan Pangan'],
    defaultObjectives: ['Peserta didik merancang dan menghasilkan karya seni berestetika tinggi serta berorientasi wirausaha kreatif.'],
  },
];

export const CURRICULUM_DATA: CurriculumLevel[] = [
  // --- KURIKULUM MERDEKA ---
  {
    id: 'merdeka-fase-a',
    name: 'Fase A (SD Kelas 1 - 2)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'Sekolah Dasar / MI',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'matematika-a',
        name: 'Matematika',
        topics: ['Bilangan Cacah 1-50', 'Penjumlahan & Pengurangan', 'Bangun Datar & Ruang Sederhana', 'Pengukuran Panjang & Berat'],
        defaultObjectives: [
          'Peserta didik mampu memahami bilangan cacah sampai 50 dan melakukan operasi penjumlahan/pengurangan konkret.',
          'Peserta didik dapat mengenali bentuk bangun datar dan mengukur panjang benda secara langsung.',
        ],
      },
      {
        id: 'bindo-a',
        name: 'Bahasa Indonesia',
        topics: ['Mengenal Huruf & Suku Kata', 'Membaca Kalimat Pendek', 'Menyimak Cerita Bergambar', 'Kosakata Lingkungan Sekitar'],
        defaultObjectives: [
          'Peserta didik bersikap menjadi pembaca dan pemirsa yang menunjukkan minat terhadap teks bacaan.',
          'Peserta didik mampu melafalkan teks pendek dengan intonasi yang wajar.',
        ],
      },
      {
        id: 'pancasila-a',
        name: 'Pendidikan Pancasila',
        topics: ['Simbol Garuda Pancasila', 'Aturan di Rumah dan Sekolah', 'Kebhinekaan di Lingkungan', 'Cinta Tanah Air'],
        defaultObjectives: [
          'Peserta didik mampu mengidentifikasi dan mematuhi aturan di rumah dan di sekolah.',
          'Peserta didik mengenal lima simbol sila Pancasila.',
        ],
      },
      {
        id: 'binggris-a',
        name: 'Bahasa Inggris Dasar',
        topics: ['Greetings & Introductions', 'Numbers 1-20 & Colors', 'Family Members', 'Animals & Fruits'],
        defaultObjectives: [
          'Peserta didik mampu menirukan dan merespons instruksi lisan sederhana dalam bahasa Inggris.',
        ],
      },
    ],
  },
  {
    id: 'merdeka-fase-b',
    name: 'Fase B (SD Kelas 3 - 4)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'Sekolah Dasar / MI',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'ipas-b',
        name: 'IPAS (Sains & Sosial)',
        topics: ['Bagian Tubuh Tumbuhan & Fotosintesis', 'Wujud Zat dan Perubahannya', 'Gaya & Gerak', 'Kearifan Lokal Daerahku', 'Peta & Bentang Alam'],
        defaultObjectives: [
          'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada tumbuhan.',
          'Peserta didik mengidentifikasi wujud zat dan perubahannya dalam kehidupan sehari-hari.',
          'Peserta didik mengenal keanekaragaman kearifan lokal di daerah asalnya.',
        ],
      },
      {
        id: 'matematika-b',
        name: 'Matematika',
        topics: ['Pecahan Senilai', 'Perkalian & Pembagian', 'Keliling & Luas Persegi/Persegi Panjang', 'Penyajian Data Diagram Gambar'],
        defaultObjectives: [
          'Peserta didik dapat membandingkan dan mengurutkan antarpecahan serta melakukan operasi perkalian cacah.',
          'Peserta didik dapat menghitung keliling dan luas bangun datar bangun sederhana.',
        ],
      },
      {
        id: 'bindo-b',
        name: 'Bahasa Indonesia',
        topics: ['Teks Narasi & Cerita Rakyat', 'Teks Petunjuk & Prosedur', 'Ide Pokok Paragraf', 'Kata Tanya 5W1H'],
        defaultObjectives: [
          'Peserta didik mampu memahami ide pokok dan ide pendukung pada paragraf teks informatif.',
          'Peserta didik mampu menulis teks petunjuk sederhana dengan runtut.',
        ],
      },
      {
        id: 'pancasila-b',
        name: 'Pendidikan Pancasila',
        topics: ['Makna Sila-Sila Pancasila', 'Hak dan Kewajiban Warga Negara', 'Keragaman Suku & Budaya Indonesia', 'Musyawarah untuk Mufakat'],
        defaultObjectives: [
          'Peserta didik memahami arti dan pengamalan nilai-nilai Pancasila dalam keseharian.',
        ],
      },
      {
        id: 'binggris-b',
        name: 'Bahasa Inggris',
        topics: ['Daily Activities & Time', 'My School Environment', 'Likes and Dislikes', 'Describing Things'],
        defaultObjectives: [
          'Peserta didik dapat berinteraksi secara lisan mengenai kegiatan sehari-hari dalam bahasa Inggris sederhana.',
        ],
      },
    ],
  },
  {
    id: 'merdeka-fase-c',
    name: 'Fase C (SD Kelas 5 - 6)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'Sekolah Dasar / MI',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'ipas-c',
        name: 'IPAS (Sains & Sosial)',
        topics: ['Sistem Pernapasan & Pencernaan Manusia', 'Rantai Makanan & Jaring-Jaring Ekosistem', 'Gelombang Cahaya & Bunyi', 'Perjuangan Kemerdekaan Indonesia', 'Kegiatan Ekonomi'],
        defaultObjectives: [
          'Peserta didik menganalisis hubungan timbal balik antarmakhluk hidup dalam rantai dan jaring-jaring makanan ekosistem.',
          'Peserta didik memahami sistem organ tubuh manusia (pernapasan, pencernaan, peredaran darah).',
          'Peserta didik meneladani perjuangan tokoh kemerdekaan Indonesia.',
        ],
      },
      {
        id: 'matematika-c',
        name: 'Matematika',
        topics: ['Pecahan Desimal & Persen', 'Rasio dan Skala', 'Volume Bangun Ruang Kubus & Balok', 'Rata-rata, Modus, dan Median Data'],
        defaultObjectives: [
          'Peserta didik menyelesaikan masalah yang berkaitan dengan pecahan desimal, persen, dan skala peta.',
          'Peserta didik menghitung volume kubus dan balok serta menafsirkan diagram data.',
        ],
      },
      {
        id: 'bindo-c',
        name: 'Bahasa Indonesia',
        topics: ['Teks Pidato & Wawancara', 'Teks Formulir & Surat Resmi', 'Karya Fiksi & Cerita Inspiratif', 'Unsur Intrinsik Cerita'],
        defaultObjectives: [
          'Peserta didik mampu menganalisis unsur intrinsik karya sastra serta menulis teks pidato persuasif.',
        ],
      },
      {
        id: 'pancasila-c',
        name: 'Pendidikan Pancasila',
        topics: ['Penerapan Nilai Pancasila', 'Norma dalam Kehidupan Bermasyarakat', 'Persatuan dan Kesatuan NKRI'],
        defaultObjectives: [
          'Peserta didik menerapkan norma hukum dan kesusilaan serta memelihara persatuan bangsa.',
        ],
      },
      {
        id: 'binggris-c',
        name: 'Bahasa Inggris',
        topics: ['Future Plans & Holiday', 'Jobs and Professions', 'Giving Directions', 'Reading Short Stories'],
        defaultObjectives: [
          'Peserta didik dapat memahami dan memproduksi teks deskriptif dan naratif pendek berbahasa Inggris.',
        ],
      },
    ],
  },
  {
    id: 'merdeka-fase-d',
    name: 'Fase D (SMP Kelas 7 - 9)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'SMP / MTs',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'ipa-d',
        name: 'Ilmu Pengetahuan Alam (IPA)',
        topics: [
          'Sel dan Mikroskop',
          'Sistem Klasifikasi Makhluk Hidup',
          'Zat, Unsur, Senyawa, dan Campuran',
          'Suhu, Kalor, dan Pemuaian',
          'Hukum Newton tentang Gerak',
          'Tekanan Zat dan Hukum Pascal',
          'Sistem Peredaran Darah & Ekskresi',
          'Listrik Dinamis & Hukum Ohm',
          'Pewarisan Sifat dan Genetika',
        ],
        defaultObjectives: [
          'Peserta didik memahami struktur sel sebagai unit terkecil kehidupan serta membedakan sel hewan dan tumbuhan.',
          'Peserta didik menerapkan konsep gerak, gaya, dan Hukum Newton dalam fenomena keseharian.',
          'Peserta didik menganalisis konsep pewarisan sifat dan bioteknologi ramah lingkungan.',
        ],
      },
      {
        id: 'matematika-d',
        name: 'Matematika',
        topics: [
          'Aljabar dan Persamaan Linear Satu Variabel',
          'Perbandingan Senilai dan Berbalik Nilai',
          'Teorema Pythagoras',
          'Lingkaran dan Sudut Pusat/Keliling',
          'Sistem Persamaan Linear Dua Variabel (SPLDV)',
          'Fungsi Kuadrat',
          'Transformasi Geometri (Translasi, Refleksi, Rotasi)',
          'Peluang dan Statistika Terapan',
        ],
        defaultObjectives: [
          'Peserta didik mampu menyelesaikan masalah menggunakan konsep sistem persamaan linear dan aljabar kontekstual.',
          'Peserta didik menerapkan Teorema Pythagoras untuk menghitung jarak dan dimensi ruang.',
          'Peserta didik menyajikan dan menganalisis sebaran data statistika serta peluang kejadian.',
        ],
      },
      {
        id: 'bindo-d',
        name: 'Bahasa Indonesia',
        topics: ['Teks Deskripsi', 'Teks Prosedur', 'Teks Laporan Hasil Observasi (LHO)', 'Teks Puisi & Cerpen', 'Teks Eksplanasi Fenomena', 'Teks Diskusi & Argumentasi'],
        defaultObjectives: [
          'Peserta didik mampu menganalisis struktur dan kaidah kebahasaan teks laporan hasil observasi dan eksplanasi.',
          'Peserta didik mampu menyusun argumen logis dalam teks diskusi.',
        ],
      },
      {
        id: 'binggris-d',
        name: 'Bahasa Inggris',
        topics: ['Descriptive Text', 'Recount Text (Past Experience)', 'Narrative Text & Fables', 'Procedure Text & Recipes', 'Expressing Opinion & Agreement'],
        defaultObjectives: [
          'Students understand specific information in written and spoken descriptive, recount, and narrative texts.',
          'Students produce coherent written paragraphs with accurate grammar and vocabulary.',
        ],
      },
      {
        id: 'ips-d',
        name: 'Ilmu Pengetahuan Sosial (IPS)',
        topics: ['Konektivitas Antarruang & Letak Indonesia', 'Dinamika Kependudukan & Interaksi Sosial', 'Kegiatan Ekonomi, Permintaan & Penawaran', 'Perubahan Sosial Budaya & Globalisasi'],
        defaultObjectives: [
          'Peserta didik menganalisis interaksi antarruang dan dinamika kependudukan di Indonesia.',
          'Peserta didik memahami mekanisme pasar, permintaan, penawaran, dan literasi finansial.',
        ],
      },
      {
        id: 'informatika-d',
        name: 'Informatika',
        topics: ['Berpikir Komputasional (Algoritma)', 'Teknologi Informasi & Komunikasi', 'Sistem Komputer & Jaringan Internet', 'Analisis Data & Spreadsheet', 'Pemrograman Visual Scratch/Blockly', 'Dampak Sosial Informatika'],
        defaultObjectives: [
          'Peserta didik mampu menerapkan dekomposisi, pola, abstraksi, dan algoritma untuk memecahkan persoalan.',
          'Peserta didik mampu merancang program visual sederhana dan menganalisis keamanan data pribadi di internet.',
        ],
      },
      {
        id: 'ppkn-d',
        name: 'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
        topics: ['Perumusan dan Penetapan Pancasila', 'UUD NRI Tahun 1945', 'Tata Urutan Peraturan Perundang-undangan', 'Keberagaman Suku, Agama, Ras, dan Antargolongan', 'Bela Negara & Wawasan Nusantara'],
        defaultObjectives: [
          'Peserta didik menganalisis proses perumusan dasar negara dan mengamalkan nilai konstitusi UUD NRI Tahun 1945.',
        ],
      },
    ],
  },
  {
    id: 'merdeka-fase-e',
    name: 'Fase E (SMA/SMK Kelas 10)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'SMA / MA / SMK',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'fisika-e',
        name: 'Fisika',
        topics: ['Pengukuran & Ketidakpastian', 'Energi Terbarukan & Efisiensi Energi', 'Pemanasan Global & Perubahan Iklim', 'Hukum Gerak & Vektor'],
        defaultObjectives: [
          'Peserta didik mampu mendesain solusi atas permasalahan krisis energi berbasis potensi energi lokal terbarukan.',
          'Peserta didik menganalisis data pengamatan dan menarik kesimpulan berdasarkan prinsip fisika.',
        ],
      },
      {
        id: 'kimia-e',
        name: 'Kimia',
        topics: ['Struktur Atom & Tabel Periodik', 'Prinsip Kimia Hijau (Green Chemistry)', 'Hukum Dasar Kimia & Stoikiometri', 'Tata Nama Senyawa'],
        defaultObjectives: [
          'Peserta didik menerapkan 12 prinsip kimia hijau dalam menjaga kelestarian lingkungan dan industri.',
          'Peserta didik menyelesaikan perhitungan stoikiometri massa dan mol zat.',
        ],
      },
      {
        id: 'biologi-e',
        name: 'Biologi',
        topics: ['Keanekaragaman Hayati Indonesia', 'Virus dan Peranannya (Vaksin & Pandemi)', 'Inovasi Bioteknologi', 'Keseimbangan Ekosistem & Daur Biogeokimia'],
        defaultObjectives: [
          'Peserta didik menganalisis ancaman kepunahan keanekaragaman hayati dan upaya konservasinya.',
          'Peserta didik mengevaluasi mekanisme replikasi virus dan pencegahan penularannya.',
        ],
      },
      {
        id: 'matematika-e',
        name: 'Matematika',
        topics: ['Eksponen dan Logaritma', 'Barisan dan Deret (Aritmetika & Geometri)', 'Vektor Ruang', 'Trigonometri Dasar', 'Statistika & Diagram Pancar'],
        defaultObjectives: [
          'Peserta didik memodelkan fenomena eksponensial (pertumbuhan/peluruhan) dalam konteks nyata.',
          'Peserta didik memecahkan masalah segitiga siku-siku menggunakan perbandingan trigonometri.',
        ],
      },
      {
        id: 'bindo-e',
        name: 'Bahasa Indonesia',
        topics: ['Teks Laporan Hasil Observasi Ilmiah', 'Teks Anekdot & Kritik Sosial', 'Teks Hikayat & Cerpen', 'Teks Negosiasi & Debat', 'Teks Biografi Tokoh'],
        defaultObjectives: [
          'Peserta didik mengevaluasi gagasan dan pesan tersirat dalam teks anekdot dan hikayat.',
          'Peserta didik menyusun argumen dalam debat dan negosiasi berbasis data faktual.',
        ],
      },
      {
        id: 'binggris-e',
        name: 'Bahasa Inggris',
        topics: ['Narrative Text & Folklore', 'Analytical Exposition Text', 'Report Text & Scientific Facts', 'Describing Places & Events'],
        defaultObjectives: [
          'Students evaluate arguments in analytical exposition texts and present viewpoints clearly.',
        ],
      },
      {
        id: 'ekonomi-e',
        name: 'Ekonomi',
        topics: ['Kelangkaan & Biaya Peluang', 'Keseimbangan Pasar & Elastisitas', 'Bank Sentral, Sistem Pembayaran & OJK', 'Manajemen & Kewirausahaan'],
        defaultObjectives: [
          'Peserta didik menyusun skala prioritas kebutuhan dan menghitung opportunity cost.',
          'Peserta didik menganalisis peran lembaga jasa keuangan dan literasi investasi bijak.',
        ],
      },
      {
        id: 'sosiologi-e',
        name: 'Sosiologi',
        topics: ['Individu, Kelompok, dan Hubungan Sosial', 'Institusi Sosial', 'Ragam Gejala Sosial di Masyarakat', 'Metode Penelitian Sosial Sederhana'],
        defaultObjectives: [
          'Peserta didik menganalisis interaksi sosial serta pembentukan identitas kelompok.',
          'Peserta didik merancang instrumen penelitian sosial sederhana mengenai masalah di sekitar.',
        ],
      },
      {
        id: 'geografi-e',
        name: 'Geografi',
        topics: ['Konsep Dasar Geografi & Peta', 'Penginderaan Jauh & SIG', 'Litosfer & Dinamika Tektonik', 'Atmosfer & Perubahan Cuaca/Iklim', 'Hidrosfer & Pengelolaan DAS'],
        defaultObjectives: [
          'Peserta didik memanfaatkan peta, citra penginderaan jauh, dan Sistem Informasi Geografis (SIG) untuk analisis spasial.',
        ],
      },
      {
        id: 'sejarah-e',
        name: 'Sejarah Indonesia',
        topics: ['Pengantar Ilmu Sejarah & Historiografi', 'Masa Praaksara di Nusantara', 'Kerajaan Hindu-Buddha & Jalur Rempah', 'Kerajaan Islam di Indonesia'],
        defaultObjectives: [
          'Peserta didik berpikir historis, diakronik, dan sinkronik dalam memahami peristiwa sejarah bangsa.',
        ],
      },
      {
        id: 'informatika-e',
        name: 'Informatika',
        topics: ['Berpikir Komputasional & Rekursi', 'Algoritma Pemrograman Python', 'Jaringan Komputer & Cyber Security', 'Analisis Big Data', 'Kecerdasan Buatan (AI) & Etika Digital'],
        defaultObjectives: [
          'Peserta didik mampu menulis program terstruktur dengan Python dan memahami etika pemanfaatan AI.',
        ],
      },
      {
        id: 'pancasila-e',
        name: 'Pendidikan Pancasila',
        topics: ['Pancasila sebagai Meja Statis & Leitstar Dinamis', 'Penerapan Konstitusi UUD 1945', 'Bhinneka Tunggal Ika & Integrasi Nasional'],
        defaultObjectives: [
          'Peserta didik mengaktualisasikan nilai-nilai Pancasila dalam menyelesaikan masalah kewarganegaraan.',
        ],
      },
    ],
  },
  {
    id: 'merdeka-fase-f',
    name: 'Fase F (SMA/SMK Kelas 11 - 12)',
    category: 'Kurikulum Merdeka',
    gradeGroup: 'SMA / MA / SMK Tingkat Lanjut',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'matematika-lanjut-f',
        name: 'Matematika Tingkat Lanjut',
        topics: ['Polinomial & Teorema Sisa', 'Matriks & Transformasi Linear', 'Fungsi Trigonometri Lanjut', 'Kalkulus: Limit Fungsi, Turunan, dan Integral Tentu'],
        defaultObjectives: [
          'Peserta didik menyelesaikan operasi polinomial dan faktorisasi suku banyak.',
          'Peserta didik menerapkan konsep turunan dan integral untuk optimasi laju perubahan dan luas bidang datar.',
        ],
      },
      {
        id: 'fisika-lanjut-f',
        name: 'Fisika Lanjut',
        topics: ['Kinematika & Dinamika Rotasi', 'Fluida Statis & Dinamis', 'Termodinamika & Mesin Carnot', 'Gelombang Mekanik & Optik Gelombang', 'Elektromagnetisme & Induksi Faraday', 'Fisika Modern & Relativitas Khusus'],
        defaultObjectives: [
          'Peserta didik memecahkan problem fluida dinamis dan hukum kontinuitas/Bernoulli pada teknologi sayap pesawat.',
          'Peserta didik menganalisis hukum Termodinamika dalam konversi energi mesin kalor.',
        ],
      },
      {
        id: 'kimia-lanjut-f',
        name: 'Kimia Lanjut',
        topics: ['Termokimia & Entalpi', 'Laju Reaksi & Katalis', 'Kesetimbangan Kimia', 'Asam Basa, pH & Titrasi', 'Larutan Penyangga (Buffer)', 'Elektrokimia, Sel Volta & Korosi', 'Kimia Karbon & Polimer'],
        defaultObjectives: [
          'Peserta didik menghitung perubahan entalpi reaksi dan menentukan orde reaksi secara eksperimental.',
          'Peserta didik menganalisis kerja sistem buffer dalam darah dan aplikasi sel elektrokimia.',
        ],
      },
      {
        id: 'biologi-lanjut-f',
        name: 'Biologi Lanjut',
        topics: ['Biologi Sel & Transport Membran', 'Metabolisme: Enzim, Katabolisme & Anabolisme', 'Sintesis Protein & Kode Genetik', 'Pola Hereditas & Mutasi Genetik', 'Evolusi & Teori Seleksi Alam', 'Bioteknologi Rekombinan & CRISPR'],
        defaultObjectives: [
          'Peserta didik menganalisis tahapan respirasi seluler aerob dan fotosintesis kloroplas.',
          'Peserta didik menghubungkan mutasi genetik dengan variasi sifat serta rekayasa genetika modern.',
        ],
      },
      {
        id: 'bahasa-inggris-f',
        name: 'Bahasa Inggris Tingkat Lanjut',
        topics: ['Analytical Exposition', 'Hortatory Exposition', 'Discussion Text with Balanced Views', 'Review Text & Academic Critique', 'Debate & Persuasive Speech'],
        defaultObjectives: [
          'Students critically evaluate complex arguments in authentic academic texts.',
          'Students compose well-supported persuasive essays with advanced cohesive devices.',
        ],
      },
      {
        id: 'ekonomi-lanjut-f',
        name: 'Ekonomi Lanjut',
        topics: ['Pendapatan Nasional & PDB', 'Pertumbuhan & Pembangunan Ekonomi', 'Ketenagakerjaan & Upah', 'Kebijakan Fiskal & Moneter', 'APBN & APBD', 'Pasar Modal & Perdagangan Internasional', 'Akuntansi Jasa & Dagang'],
        defaultObjectives: [
          'Peserta didik menghitung indikator makroekonomi (PDB, inflasi, defisit anggaran) dan siklus akuntansi keuangan.',
        ],
      },
      {
        id: 'sosiologi-lanjut-f',
        name: 'Sosiologi Lanjut',
        topics: ['Struktur Sosial & Diferensiasi', 'Konflik Sosial, Kekerasan & Perdamaian', 'Harmoni Sosial & Integrasi', 'Globalisasi & Ketimpangan Sosial', 'Kearifan Lokal dalam Pemberdayaan Komunitas'],
        defaultObjectives: [
          'Peserta didik merancang strategi resolusi konflik sosial dan program pemberdayaan berbasis kearifan lokal.',
        ],
      },
      {
        id: 'geografi-lanjut-f',
        name: 'Geografi Lanjut',
        topics: ['Posisi Strategis Indonesia Poros Maritim', 'Flora Fauna & Bioma Dunia', 'Pengelolaan Sumber Daya Alam Berkelanjutan', 'Mitigasi Bencana Alam', 'Kerjasama Negara Maju & Berkembang'],
        defaultObjectives: [
          'Peserta didik merancang program mitigasi adaptif terhadap bencana alam di wilayah Indonesia.',
        ],
      },
    ],
  },

  // --- KURIKULUM 2013 (K13) ---
  {
    id: 'k13-smp',
    name: 'K13 SMP / MTs (Kelas 7 - 9)',
    category: 'Kurikulum 2013 (K13)',
    gradeGroup: 'SMP / MTs',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'k13-mat-smp',
        name: 'Matematika K13',
        topics: ['Operasi Bilangan Bulat', 'Himpunan', 'Persamaan Garis Lurus', 'Teorema Pythagoras', 'Lingkaran & Bangun Ruang Sisi Lengkung', 'Peluang'],
        defaultObjectives: [
          'Kompetensi Dasar 3.1 & 4.1: Menjelaskan dan menyelesaikan masalah penalaran aljabar dan geometri.',
        ],
      },
      {
        id: 'k13-ipa-smp',
        name: 'IPA Terpadu K13',
        topics: ['Klasifikasi Materi', 'Sistem Pencernaan & Sirkulasi', 'Gaya dan Tekanan Zat', 'Optik & Alat Optik', 'Kemagnetan'],
        defaultObjectives: [
          'Kompetensi Dasar 3.4 & 4.4: Menganalisis konsep tekanan zat dan penerapannya dalam kehidupan.',
        ],
      },
      {
        id: 'k13-indo-smp',
        name: 'Bahasa Indonesia K13',
        topics: ['Teks Berita', 'Teks Iklan, Slogan & Poster', 'Teks Eksposisi', 'Teks Puisi', 'Teks Ulasan', 'Buku Fiksi dan Nonfiksi'],
        defaultObjectives: [
          'Kompetensi Dasar 3.2 & 4.2: Menelaah struktur dan kaidah kebahasaan berbagai teks informatif.',
        ],
      },
      {
        id: 'k13-inggris-smp',
        name: 'Bahasa Inggris K13',
        topics: ['Interpersonal & Transactional Dialogues', 'Greeting Cards & Invitations', 'Short Functional Text', 'Recount & Narrative Texts'],
        defaultObjectives: [
          'Kompetensi Dasar 3.5 & 4.5: Mengidentifikasi fungsi sosial dan unsur kebahasaan teks interaksi transaksional.',
        ],
      },
      {
        id: 'k13-ips-smp',
        name: 'IPS Terpadu K13',
        topics: ['Interaksi Keruangan Antarnegara Asia', 'Perubahan Sosial Budaya Bangsa', 'Ketergantungan Antarruang & Pengaruhnya', 'Masa Kemerdekaan Indonesia'],
        defaultObjectives: [
          'Kompetensi Dasar 3.3 & 4.3: Menganalisis keunggulan dan keterbatasan ruang serta pengaruhnya terhadap kegiatan ekonomi.',
        ],
      },
      {
        id: 'k13-pkn-smp',
        name: 'PPKn K13',
        topics: ['Pancasila sebagai Dasar Negara', 'Norma dan Keadilan', 'Kedaulatan NKRI', 'Semangat Sumpah Pemuda 1928'],
        defaultObjectives: [
          'Kompetensi Dasar 3.1 & 4.1: Mensyukuri dan mewujudkan nilai Pancasila dalam kehidupan berbangsa.',
        ],
      },
    ],
  },
  {
    id: 'k13-sma',
    name: 'K13 SMA / MA (Kelas 10 - 12)',
    category: 'Kurikulum 2013 (K13)',
    gradeGroup: 'SMA / MA (MIPA & IPS)',
    subjects: [
      ...ADDITIONAL_SUBJECTS,
      {
        id: 'k13-mat-sma',
        name: 'Matematika Peminatan / Wajib K13',
        topics: ['Fungsi Eksponen & Logaritma', 'Vektor', 'Trigonometri Analitik', 'Turunan Fungsi Aljabar & Aplikasi', 'Integral'],
        defaultObjectives: [
          'Kompetensi Dasar 3.5 & 4.5: Menjelaskan keberlakuan konsep turunan dan integral fungsi matematis.',
        ],
      },
      {
        id: 'k13-fis-sma',
        name: 'Fisika K13',
        topics: ['Kinematika Gerak Lurus', 'Hukum Gravitasi Newton', 'Usaha dan Energi', 'Gelombang Cahaya & Bunyi', 'Rangkaian Arus Bolak Balik (AC)'],
        defaultObjectives: [
          'Kompetensi Dasar 3.7 & 4.7: Menganalisis interaksi gaya dan konservasi hukum kekekalan energi.',
        ],
      },
      {
        id: 'k13-kim-sma',
        name: 'Kimia K13',
        topics: ['Struktur Atom & Ikatan Kimia', 'Larutan Elektrolit & Redoks', 'Termokimia', 'Kesetimbangan Kimia', 'Sifat Koligatif Larutan'],
        defaultObjectives: [
          'Kompetensi Dasar 3.8 & 4.8: Menganalisis sifat larutan berdasarkan daya hantar listrik dan perubahan bilangan oksidasi.',
        ],
      },
      {
        id: 'k13-bio-sma',
        name: 'Biologi K13',
        topics: ['Keanekaragaman Hayati', 'Struktur Jaringan Tumbuhan & Hewan', 'Sistem Organ Manusia', 'Metabolisme Sel', 'Genetika & Hereditas'],
        defaultObjectives: [
          'Kompetensi Dasar 3.3 & 4.3: Menjelaskan prinsip-prinsip klasifikasi makhluk hidup dalam lima kingdom.',
        ],
      },
      {
        id: 'k13-eko-sma',
        name: 'Ekonomi K13',
        topics: ['Konsep Ilmu Ekonomi', 'Masalah Pokok Ekonomi', 'Pasar Modal & OJK', 'Pendapatan Nasional', 'Kebijakan Moneter & Fiskal'],
        defaultObjectives: [
          'Kompetensi Dasar 3.1 & 4.1: Mendeskripsikan konsep ilmu ekonomi dan kelangkaan sumber daya.',
        ],
      },
      {
        id: 'k13-geo-sma',
        name: 'Geografi K13',
        topics: ['Pengetahuan Dasar Geografi', 'Dinamika Planet Bumi', 'Dinamika Litosfer & Pedosfer', 'Pengelolaan Sumber Daya Alam'],
        defaultObjectives: [
          'Kompetensi Dasar 3.1 & 4.1: Memahami pengetahuan dasar geografi dan terapannya dalam kehidupan.',
        ],
      },
      {
        id: 'k13-sos-sma',
        name: 'Sosiologi K13',
        topics: ['Sosiologi sebagai Ilmu Masyarakat', 'Hubungan Sosial & Realitas Sosial', 'Stratifikasi & Diferensiasi Sosial', 'Konflik Sosial'],
        defaultObjectives: [
          'Kompetensi Dasar 3.1 & 4.1: Memahami fungsi sosiologi untuk mengenali gejala sosial di masyarakat.',
        ],
      },
    ],
  },
];

export const BLOOM_LEVELS = [
  { id: 'C1', name: 'C1: Mengingat (Remembering)', category: 'LOTS', desc: 'Menyebutkan istilah, fakta, rumus dasar' },
  { id: 'C2', name: 'C2: Memahami (Understanding)', category: 'LOTS', desc: 'Menjelaskan ide, mengklasifikasi, merangkum' },
  { id: 'C3', name: 'C3: Mengaplikasikan (Applying)', category: 'MOTS', desc: 'Menggunakan rumus, mengimplementasikan prosedur' },
  { id: 'C4', name: 'C4: Menganalisis (Analyzing)', category: 'HOTS', desc: 'Membedakan, mengorganisasi, menghubungkan data sebab-akibat' },
  { id: 'C5', name: 'C5: Mengevaluasi (Evaluating)', category: 'HOTS', desc: 'Menilai argumen, mengkritik, memvalidasi keputusan' },
  { id: 'C6', name: 'C6: Mencipta (Creating)', category: 'HOTS', desc: 'Merancang solusi baru, membuat hipotesis, menyusun rencana' },
];

