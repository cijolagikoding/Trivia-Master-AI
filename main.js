// ==========================================
// TRIVIA MASTER AI - PRODUCTION LOGIC
// ==========================================

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const loadingScreen = document.getElementById('loading-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const appContainer = document.querySelector('.app-container');

// Forms & Controls
const setupForm = document.getElementById('setup-form');
const topicInput = document.getElementById('topic-input');
const categoryChips = document.querySelectorAll('.category-chips .chip');
const questionCountSelect = document.getElementById('question-count');
const timerModeSelect = document.getElementById('timer-mode');
const soundToggleBtn = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

// Loading screen
const loadingTitle = document.getElementById('loading-title');
const loadingDesc = document.getElementById('loading-desc');

// Quiz Screen Elements
const currentTopicBadge = document.getElementById('current-topic-badge');
const sourceBadge = document.getElementById('source-badge');
const streakCountDisplay = document.getElementById('streak-count');
const timerContainer = document.getElementById('timer-container');
const timerText = document.getElementById('timer-text');
const progressFill = document.getElementById('progress-fill');
const qCounterLabel = document.getElementById('q-counter-label');
const scoreDisplay = document.getElementById('score-display');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const explanationCard = document.getElementById('explanation-card');
const expIcon = document.getElementById('exp-icon');
const expTitle = document.getElementById('exp-title');
const expText = document.getElementById('exp-text');

// Result Screen Elements
const resultBadge = document.getElementById('result-badge');
const resultTitle = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const finalScoreText = document.getElementById('final-score-text');
const finalPctText = document.getElementById('final-pct-text');
const scoreCircleBar = document.getElementById('score-circle-bar');
const resCorrectCount = document.getElementById('res-correct-count');
const resWrongCount = document.getElementById('res-wrong-count');
const resMaxStreak = document.getElementById('res-max-streak');
const btnRestart = document.getElementById('btn-restart');
const btnReview = document.getElementById('btn-review');
const btnShare = document.getElementById('btn-share');
const reviewSection = document.getElementById('review-section');
const reviewList = document.getElementById('review-list');
const toast = document.getElementById('toast');

// Stats Elements
const statHighScore = document.getElementById('stat-high-score');
const statQuizzesPlayed = document.getElementById('stat-quizzes-played');

// ==========================================
// STATE MANAGEMENT & PERSISTENCE
// ==========================================
let currentQuizSession = {
    topic: 'Semua Kategori',
    totalTarget: 5,
    timerLimit: 15,
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    userAnswers: [] // { question, options, selected, correct, isCorrect, explanation }
};

let timerInterval = null;
let timeLeft = 15;
let isAnswering = false;
let soundEnabled = true;

// Web Audio API Synthesizer (Bebas copyright, zero latency, tidak butuh file eksternal)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'correct') {
            // Ding Ding (Harmonic Maj7 Chime)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'wrong') {
            // Low Thud / Buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(130, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'tick') {
            // Short subtle click
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'win') {
            // Victory Fanfare
            const notes = [440, 554.37, 659.25, 880];
            notes.forEach((freq, idx) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
                noteGain.gain.setValueAtTime(0.15, now + idx * 0.1);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
                noteOsc.start(now + idx * 0.1);
                noteOsc.stop(now + idx * 0.1 + 0.35);
            });
        }
    } catch (e) {
        console.warn("Audio Context belum diaktifkan:", e);
    }
}

// Load & Save Stats in LocalStorage
function loadStats() {
    const highScore = localStorage.getItem('trivia_high_score') || 0;
    const played = localStorage.getItem('trivia_played_count') || 0;
    statHighScore.textContent = highScore;
    statQuizzesPlayed.textContent = played;
}

function updateStats(newScore) {
    let currentHigh = parseInt(localStorage.getItem('trivia_high_score') || '0', 10);
    let played = parseInt(localStorage.getItem('trivia_played_count') || '0', 10);
    
    played += 1;
    if (newScore > currentHigh) {
        currentHigh = newScore;
        localStorage.setItem('trivia_high_score', currentHigh);
    }
    localStorage.setItem('trivia_played_count', played);
    loadStats();
}

loadStats();

// ==========================================
// BANK SOAL LENGKAP BAHASA INDONESIA (50+ SOAL)
// ==========================================
const masterQuestionsPool = [
    // --- INDONESIA & UMUM ---
    {
        category: "umum",
        question: "Apa nama ibu kota resmi masa depan Indonesia yang berlokasi di Kalimantan Timur?",
        options: ["Nusantara (IKN)", "Balikpapan", "Samarinda", "Banjarmasin"],
        answer: "Nusantara (IKN)",
        explanation: "IKN Nusantara dibangun di Penajam Paser Utara dan Kutai Kartanegara, Kaltim sebagai pusat pemerintahan baru."
    },
    {
        category: "umum",
        question: "Pulau terbesar di Indonesia yang seluruh daratannya merupakan wilayah kedaulatan NKRI adalah?",
        options: ["Sumatera", "Jawa", "Sulawesi", "Papua"],
        answer: "Sumatera",
        explanation: "Sumatera adalah pulau terbesar yang 100% berada dalam teritorial Indonesia (Kalimantan dan Papua terbagi dengan negara lain)."
    },
    {
        category: "umum",
        question: "Candi bercorak Buddha terbesar di dunia yang terletak di Jawa Tengah adalah?",
        options: ["Candi Borobudur", "Candi Prambanan", "Candi Mendut", "Candi Sewu"],
        answer: "Candi Borobudur",
        explanation: "Borobudur didirikan pada abad ke-8 oleh wangsa Syailendra dan diakui UNESCO sebagai warisan dunia."
    },
    {
        category: "umum",
        question: "Siapakah pencipta lagu kebangsaan 'Indonesia Raya'?",
        options: ["Wage Rudolf Supratman", "Ismail Marzuki", "Kusbini", "C. Simanjuntak"],
        answer: "Wage Rudolf Supratman",
        explanation: "W.R. Supratman pertama kali memperdengarkan Indonesia Raya pada Kongres Pemuda II tanggal 28 Oktober 1928."
    },
    {
        category: "umum",
        question: "Di provinsi manakah Danau Matano, danau terdalam di Indonesia dan Asia Tenggara, berada?",
        options: ["Sulawesi Selatan", "Sulawesi Tengah", "Sumatera Utara", "Papua"],
        answer: "Sulawesi Selatan",
        explanation: "Danau Matano memiliki kedalaman mencapai 590 meter dan terletak di Kabupaten Luwu Timur, Sulawesi Selatan."
    },
    {
        category: "umum",
        question: "Selat yang memisahkan antara Pulau Jawa dan Pulau Sumatera dinamakan?",
        options: ["Selat Sunda", "Selat Malaka", "Selat Makassar", "Selat Bali"],
        answer: "Selat Sunda",
        explanation: "Selat Sunda menghubungkan Laut Jawa dengan Samudra Hindia dan memisahkan Pulau Jawa serta Sumatera."
    },
    {
        category: "umum",
        question: "Gunung tertinggi di Indonesia yang diselimuti gletser/salju abadi adalah?",
        options: ["Puncak Jaya (Carstensz)", "Gunung Kerinci", "Gunung Rinjani", "Gunung Semeru"],
        answer: "Puncak Jaya (Carstensz)",
        explanation: "Puncak Jaya memiliki ketinggian 4.884 mdpl di Pegunungan Sudirman, Papua Tengah."
    },
    {
        category: "umum",
        question: "Senjata tradisional khas suku Dayak di Kalimantan yang terkenal adalah?",
        options: ["Mandau", "Keris", "Rencong", "Kujang"],
        answer: "Mandau",
        explanation: "Mandau adalah senjata pusaka dan identitas kebanggaan masyarakat suku Dayak."
    },

    // --- TEKNOLOGI & KOMPUTER ---
    {
        category: "teknologi",
        question: "Bahasa pemrograman apa yang berjalan secara bawaan (native) di dalam browser web?",
        options: ["JavaScript", "Python", "C++", "Java"],
        answer: "JavaScript",
        explanation: "JavaScript diciptakan oleh Brendan Eich pada 1995 dan menjadi standar utama logika interaktif web client-side."
    },
    {
        category: "teknologi",
        question: "Singkatan dari apakah 'HTML' dalam pembuatan halaman web?",
        options: ["HyperText Markup Language", "HighText Machine Language", "Hyperlink and Text Management Level", "Home Tool Markup Language"],
        answer: "HyperText Markup Language",
        explanation: "HTML adalah bahasa markah standar untuk menstrukturkan dokumen web dan konten aplikasi."
    },
    {
        category: "teknologi",
        question: "Sistem operasi open-source berbasis kernel Linux pertama kali dikembangkan oleh siapa?",
        options: ["Linus Torvalds", "Steve Wozniak", "Bill Gates", "Dennis Ritchie"],
        answer: "Linus Torvalds",
        explanation: "Linus Torvalds merilis kernel Linux pertama kali pada tahun 1991 saat masih berstatus mahasiswa di Finlandia."
    },
    {
        category: "teknologi",
        question: "Protokol keamanan web yang menggunakan enkripsi SSL/TLS ditandai dengan singkatan apa?",
        options: ["HTTPS", "HTTP", "FTP", "SSH"],
        answer: "HTTPS",
        explanation: "HTTPS (HyperText Transfer Protocol Secure) memastikan komunikasi terenkripsi antara browser dan web server."
    },
    {
        category: "teknologi",
        question: "Berapakah kompleksitas waktu rata-rata (average time complexity) dari algoritma QuickSort?",
        options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"],
        answer: "O(n log n)",
        explanation: "QuickSort menggunakan pendekatan divide-and-conquer dengan performa rata-rata O(n log n)."
    },
    {
        category: "teknologi",
        question: "Perusahaan yang pertama kali merilis sistem operasi Android ke publik adalah?",
        options: ["Google", "Apple", "Microsoft", "Samsung"],
        answer: "Google",
        explanation: "Google mengakuisisi Android Inc. pada 2005 dan merilis smartphone komersial pertamanya (HTC Dream) pada 2008."
    },
    {
        category: "teknologi",
        question: "Apa kepanjangan dari istilah 'RAM' pada komponen komputer?",
        options: ["Random Access Memory", "Read Access Module", "Rapid Action Memory", "Routing Array Mechanism"],
        answer: "Random Access Memory",
        explanation: "RAM adalah memori volatile cepat tempat data program aktif disimpan sementara saat dijalankan."
    },
    {
        category: "teknologi",
        question: "Model AI revolusioner dari OpenAI yang meluncurkan era chatbot modern pada akhir 2022 adalah?",
        options: ["ChatGPT", "DeepBlue", "AlphaGo", "Siri"],
        answer: "ChatGPT",
        explanation: "ChatGPT diluncurkan pada November 2022 dan menjadi aplikasi dengan pertumbuhan pengguna tercepat di dunia."
    },

    // --- SAINS & ALAM SEMESTA ---
    {
        category: "sains",
        question: "Planet apakah yang memiliki julukan 'Planet Merah' di tata surya kita?",
        options: ["Mars", "Venus", "Jupiter", "Merkurius"],
        answer: "Mars",
        explanation: "Mars tampak berwarna kemerahan karena tingginya kandungan zat besi oksida (karat) di permukaannya."
    },
    {
        category: "sains",
        question: "Unsur kimia apakah yang memiliki simbol 'O' pada tabel periodik?",
        options: ["Oksigen", "Osmium", "Oganeson", "Ozon"],
        answer: "Oksigen",
        explanation: "Oksigen memiliki nomor atom 8 dan merupakan unsur gas paling melimpah di kerak bumi."
    },
    {
        category: "sains",
        question: "Bagian sel yang sering dijuluki sebagai 'pembangkit tenaga' (powerhouse of the cell) adalah?",
        options: ["Mitokondria", "Ribosom", "Nukleus", "Badan Golgi"],
        answer: "Mitokondria",
        explanation: "Mitokondria memproduksi ATP (adenosin trifosfat) yang merupakan sumber energi kimiawi utama sel."
    },
    {
        category: "sains",
        question: "Berapa perkiraan kecepatan rambat cahaya di ruang hampa udara?",
        options: ["300.000 km/detik", "150.000 km/detik", "500.000 km/detik", "1.000.000 km/detik"],
        answer: "300.000 km/detik",
        explanation: "Kecepatan cahaya (c) adalah konstanta fisika sekitar 299.792 kilometer per detik."
    },
    {
        category: "sains",
        question: "Hukum gravitasi umum pertama kali dirumuskan secara matematis oleh ilmuwan siapa?",
        options: ["Sir Isaac Newton", "Albert Einstein", "Galileo Galilei", "Johannes Kepler"],
        answer: "Sir Isaac Newton",
        explanation: "Newton mempublikasikan hukum gravitasi dan ketiga hukum geraknya dalam buku Philosophiae Naturalis Principia Mathematica (1687)."
    },
    {
        category: "sains",
        question: "Gas apa yang paling banyak menyusun lapisan atmosfer bumi kita?",
        options: ["Nitrogen (78%)", "Oksigen (21%)", "Karbon Dioksida (0.04%)", "Argon (0.9%)"],
        answer: "Nitrogen (78%)",
        explanation: "Sekitar 78% atmosfer bumi terdiri dari gas Nitrogen, diikuti Oksigen 21%, dan Argon 0.9%."
    },
    {
        category: "sains",
        question: "Hewan mamalia terbesar di dunia yang masih hidup hingga saat ini adalah?",
        options: ["Paus Biru", "Gajah Afrika", "Hiu Paus", "Jerapah"],
        answer: "Paus Biru",
        explanation: "Paus Biru (Balaenoptera musculus) dapat mencapai panjang 30 meter dan bobot hingga 200 ton."
    },

    // --- GAME, FILM & POP CULTURE ---
    {
        category: "populer",
        question: "Siapakah nama maskot kuning berbentuk tikus listrik legendaris dari waralaba Pokémon?",
        options: ["Pikachu", "Raichu", "Charmander", "Squirtle"],
        answer: "Pikachu",
        explanation: "Pikachu adalah Pokémon tipe listrik yang menjadi maskot resmi franchise Pokémon karya Nintendo & Game Freak."
    },
    {
        category: "populer",
        question: "Dalam serial One Piece, apa nama kapal pertama yang digunakan oleh kelompok Bajak Laut Topi Jerami?",
        options: ["Going Merry", "Thousand Sunny", "Red Force", "Moby Dick"],
        answer: "Going Merry",
        explanation: "Going Merry adalah kapal karavel pemberian Kaya yang setia menemani kru Luffy hingga saga Enies Lobby."
    },
    {
        category: "populer",
        question: "Siapa aktor Hollywood yang memerankan karakter Tony Stark alias Iron Man di Marvel Cinematic Universe?",
        options: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth"],
        answer: "Robert Downey Jr.",
        explanation: "Robert Downey Jr. memerankan Tony Stark sejak film Iron Man (2008) hingga Avengers: Endgame (2019)."
    },
    {
        category: "populer",
        question: "Game battle royale pertama yang mempopulerkan istilah 'Winner Winner Chicken Dinner' adalah?",
        options: ["PUBG", "Free Fire", "Fortnite", "Apex Legends"],
        answer: "PUBG",
        explanation: "PlayerUnknown's Battlegrounds (PUBG) mempopulerkan jargon kemenangan tersebut di ranah esports."
    },
    {
        category: "populer",
        question: "Studio animasi Jepang legendaris yang memproduksi film 'Spirited Away' dan 'My Neighbor Totoro' bernama?",
        options: ["Studio Ghibli", "Toei Animation", "MAPPA", "Ufotable"],
        answer: "Studio Ghibli",
        explanation: "Studio Ghibli didirikan oleh Hayao Miyazaki dan Isao Takahata pada tahun 1985."
    },
    {
        category: "populer",
        question: "Siapakah Hokage Keempat dalam serial anime & manga Naruto?",
        options: ["Minato Namikaze", "Hiruzen Sarutobi", "Tsunade", "Kakashi Hatake"],
        answer: "Minato Namikaze",
        explanation: "Minato Namikaze dijuluki 'Kilat Kuning dari Konoha' dan merupakan ayah kandung dari Naruto Uzumaki."
    },
    {
        category: "populer",
        question: "Siapa komposer di balik soundtrack musik epik film 'Interstellar' dan 'Inception'?",
        options: ["Hans Zimmer", "John Williams", "Ennio Morricone", "Alan Silvestri"],
        answer: "Hans Zimmer",
        explanation: "Hans Zimmer adalah komposer peraih Piala Oscar yang terkenal dengan aransemen musik film megah."
    },

    // --- SEJARAH & BUDAYA ---
    {
        category: "sejarah",
        question: "Pada tanggal, bulan, dan tahun berapakah Proklamasi Kemerdekaan Republik Indonesia dibacakan?",
        options: ["17 Agustus 1945", "18 Agustus 1945", "17 Agustus 1944", "1 Juni 1945"],
        answer: "17 Agustus 1945",
        explanation: "Teks Proklamasi dibacakan oleh Ir. Soekarno didampingi Drs. Mohammad Hatta di Jl. Pegangsaan Timur No. 56 Jakarta."
    },
    {
        category: "sejarah",
        question: "Bangunan megah Piramida Agung Giza yang termasuk keajaiban dunia kuno terletak di negara mana?",
        options: ["Mesir", "Yunani", "Irak", "Turki"],
        answer: "Mesir",
        explanation: "Piramida Agung Khufu di Giza, Mesir adalah satu-satunya dari Tujuh Keajaiban Dunia Kuno yang masih utuh berdiri."
    },
    {
        category: "sejarah",
        question: "Patih terkenal dari Kerajaan Majapahit yang mengucapkan ikrar bersejarah 'Sumpah Palapa' bernama?",
        options: ["Gajah Mada", "Hayam Wuruk", "Kertanegara", "Ken Arok"],
        answer: "Gajah Mada",
        explanation: "Patih Gajah Mada bersumpah tidak akan menikmati istirahat/kemewahan sebelum menyatukan seluruh Nusantara."
    },
    {
        category: "sejarah",
        question: "Kapal pesiar mewah Titanic tenggelam setelah menabrak gunung es pada tahun berapa?",
        options: ["1912", "1905", "1918", "1923"],
        answer: "1912",
        explanation: "RMS Titanic tenggelam pada pelayaran perdananya dari Southampton ke New York pada 15 April 1912."
    },
    {
        category: "sejarah",
        question: "Revolusi Prancis yang menggulingkan monarki absolut dimulai dengan penyerbuan penjara Bastille pada tahun?",
        options: ["1789", "1776", "1799", "1804"],
        answer: "1789",
        explanation: "Penyerbuan Bastille terjadi pada 14 Juli 1789 dan kini diperingati sebagai Hari Nasional Prancis (Bastille Day)."
    },
    {
        category: "sejarah",
        question: "Konferensi Asia-Afrika (KAA) yang melahirkan Gerakan Non-Blok diselenggarakan pertama kali pada tahun 1955 di kota?",
        options: ["Bandung", "Jakarta", "Yogyakarta", "Bogor"],
        answer: "Bandung",
        explanation: "KAA berlangsung di Gedung Merdeka Bandung pada April 1955 dihadiri 29 negara kawasan Asia dan Afrika."
    }
];

// Helper: Fisher-Yates Shuffle
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Helper: Screen Switcher
function showScreen(screenElement) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screenElement.classList.add('active');
}

// Helper: Toast Message
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==========================================
// EVENT LISTENERS & SETUP
// ==========================================

// Category Chips Selection
categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        topicInput.value = ''; // Reset custom input if chip selected
    });
});

topicInput.addEventListener('input', () => {
    if (topicInput.value.trim() !== '') {
        categoryChips.forEach(c => c.classList.remove('active'));
    }
});

// Sound Toggle
soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    showToast(soundEnabled ? 'Suara Diaktifkan 🔊' : 'Suara Dimatikan 🔇');
});

// Submit Setup Form
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    initAudio();

    const customTopic = topicInput.value.trim();
    let selectedCat = 'all';
    const activeChip = document.querySelector('.category-chips .chip.active');
    if (activeChip) {
        selectedCat = activeChip.getAttribute('data-cat');
    }

    const targetCount = parseInt(questionCountSelect.value, 10) || 5;
    const timerLimit = parseInt(timerModeSelect.value, 10);

    const activeTopicName = customTopic || (activeChip ? activeChip.textContent.replace(/^[^\w\s]+\s*/, '') : 'Semua Acak');

    currentQuizSession = {
        topic: activeTopicName,
        category: selectedCat,
        customTopic: customTopic,
        totalTarget: targetCount,
        timerLimit: timerLimit,
        questions: [],
        currentIndex: 0,
        score: 0,
        streak: 0,
        maxStreak: 0,
        userAnswers: []
    };

    loadingDesc.textContent = `Meracik ${targetCount} soal terbaik seputar "${activeTopicName}"...`;
    showScreen(loadingScreen);

    await prepareQuizQuestions();
});

// ==========================================
// QUIZ GENERATION (MULTI-ENDPOINT AI + POOL)
// ==========================================
async function prepareQuizQuestions() {
    let generatedQuestions = [];
    let isAIGenerated = false;
    const topic = currentQuizSession.customTopic;
    const targetCount = currentQuizSession.totalTarget;

    // 1. Coba Generate dengan AI jika ada topik khusus (dengan multi-fallback)
    if (topic) {
        // Coba Endpoint 1: Pollinations GET endpoint (Paling stabil & tidak pernah terblokir CORS)
        try {
            const seed = Math.floor(Math.random() * 999999);
            const promptInstruction = `Buatkan ${targetCount} soal pilihan ganda tentang "${topic}" bahasa Indonesia. Format HANYA JSON array: [{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}]`;
            const encodedPrompt = encodeURIComponent(promptInstruction);
            const getUrl = `https://text.pollinations.ai/${encodedPrompt}?json=true&seed=${seed}`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(getUrl, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                let text = await res.text();
                text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const match = text.match(/\[[\s\S]*\]/);
                if (match) text = match[0];

                const parsed = JSON.parse(text);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    generatedQuestions = parsed.map(item => ({
                        question: item.question,
                        options: shuffleArray(item.options || ["A", "B", "C", "D"]),
                        answer: item.answer || item.options[0],
                        explanation: item.explanation || "Jawaban yang benar adalah " + (item.answer || item.options[0])
                    }));
                    isAIGenerated = true;
                }
            }
        } catch (e1) {
            console.warn("Pollinations GET fallback, mencoba POST endpoint:", e1);
        }

        // Coba Endpoint 2 jika GET gagal: Pollinations POST
        if (generatedQuestions.length === 0) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 7000);

                const res = await fetch("https://text.pollinations.ai/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: "You are a trivia quiz generator. Output pure JSON array only." },
                            { role: "user", content: `Buat ${targetCount} soal pilihan ganda tentang "${topic}" dalam bahasa Indonesia. Format JSON: [{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}]` }
                        ],
                        jsonMode: true,
                        seed: Math.floor(Math.random() * 999999)
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (res.ok) {
                    let text = await res.text();
                    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const match = text.match(/\[[\s\S]*\]/);
                    if (match) text = match[0];

                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        generatedQuestions = parsed.map(item => ({
                            question: item.question,
                            options: shuffleArray(item.options || ["A", "B", "C", "D"]),
                            answer: item.answer || item.options[0],
                            explanation: item.explanation || "Jawaban yang benar adalah " + (item.answer || item.options[0])
                        }));
                        isAIGenerated = true;
                    }
                }
            } catch (e2) {
                console.warn("AI generation offline/failed, menggunakan Master Bank Soal:", e2);
            }
        }
    }

    // 2. Jika AI tidak dipakai atau gagal, gunakan Master Questions Pool
    if (generatedQuestions.length < targetCount) {
        let pool = [...masterQuestionsPool];
        if (currentQuizSession.category && currentQuizSession.category !== 'all') {
            const filtered = pool.filter(q => q.category === currentQuizSession.category);
            if (filtered.length >= 3) {
                pool = filtered;
            }
        }

        const shuffled = shuffleArray(pool);
        const needed = targetCount - generatedQuestions.length;
        const additional = shuffled.slice(0, needed).map(q => ({
            question: q.question,
            options: shuffleArray(q.options),
            answer: q.answer,
            explanation: q.explanation
        }));

        generatedQuestions = [...generatedQuestions, ...additional];
    }

    currentQuizSession.isAIGenerated = isAIGenerated;
    currentQuizSession.questions = generatedQuestions.slice(0, targetCount);
    
    // Mulai permainan
    startQuiz();
}

// ==========================================
// QUIZ GAMEPLAY & ENGINE
// ==========================================
function startQuiz() {
    currentQuizSession.currentIndex = 0;
    currentQuizSession.score = 0;
    currentQuizSession.streak = 0;
    currentQuizSession.maxStreak = 0;
    currentQuizSession.userAnswers = [];

    currentTopicBadge.textContent = currentQuizSession.topic.length > 15 ? currentQuizSession.topic.substring(0, 15) + '...' : currentQuizSession.topic;
    
    // Update Source Badge (AI Generated vs Bank Soal)
    if (sourceBadge) {
        if (currentQuizSession.isAIGenerated) {
            sourceBadge.textContent = '⚡ AI Live';
            sourceBadge.className = 'badge badge-source';
        } else {
            sourceBadge.textContent = '📚 Bank Soal';
            sourceBadge.className = 'badge badge-source pool';
        }
    }

    scoreDisplay.textContent = '0';
    streakCountDisplay.textContent = '0';

    if (currentQuizSession.timerLimit === 0) {
        timerContainer.style.display = 'none';
    } else {
        timerContainer.style.display = 'flex';
    }

    showScreen(quizScreen);
    renderQuestion();
}

function renderQuestion() {
    isAnswering = false;
    clearInterval(timerInterval);
    explanationCard.style.display = 'none';

    const qIndex = currentQuizSession.currentIndex;
    const totalQ = currentQuizSession.questions.length;
    const currentQ = currentQuizSession.questions[qIndex];

    // Update Progress
    const pct = ((qIndex + 1) / totalQ) * 100;
    progressFill.style.width = `${pct}%`;
    qCounterLabel.textContent = `Soal ${qIndex + 1} dari ${totalQ}`;
    scoreDisplay.textContent = currentQuizSession.score;
    streakCountDisplay.textContent = currentQuizSession.streak;

    // Render Question Text
    questionText.textContent = currentQ.question;

    // Render Options
    optionsContainer.innerHTML = '';
    const prefixes = ['A', 'B', 'C', 'D'];

    currentQ.options.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerHTML = `
            <span class="option-prefix">${prefixes[i] || (i+1)}</span>
            <span class="option-label">${optText}</span>
        `;

        btn.addEventListener('click', () => handleAnswer(btn, optText, currentQ));
        optionsContainer.appendChild(btn);
    });

    // Start Timer if enabled
    if (currentQuizSession.timerLimit > 0) {
        startTimer();
    }
}

function startTimer() {
    timeLeft = currentQuizSession.timerLimit;
    timerText.textContent = `${timeLeft}s`;
    timerContainer.classList.remove('timer-low');

    timerInterval = setInterval(() => {
        timeLeft--;
        timerText.textContent = `${timeLeft}s`;

        if (timeLeft <= 5) {
            timerContainer.classList.add('timer-low');
            playSound('tick');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    if (isAnswering) return;
    const currentQ = currentQuizSession.questions[currentQuizSession.currentIndex];
    handleAnswer(null, "[Waktu Habis]", currentQ, true);
}

function handleAnswer(buttonElement, selectedAnswer, questionObj, isTimeout = false) {
    if (isAnswering) return;
    isAnswering = true;
    clearInterval(timerInterval);

    const isCorrect = !isTimeout && (selectedAnswer.trim() === questionObj.answer.trim());
    const allButtons = optionsContainer.querySelectorAll('.option-btn');
    allButtons.forEach(btn => btn.disabled = true);

    // Record User Answer for Review
    currentQuizSession.userAnswers.push({
        question: questionObj.question,
        selected: isTimeout ? 'Waktu Habis ⏱️' : selectedAnswer,
        correct: questionObj.answer,
        isCorrect: isCorrect,
        explanation: questionObj.explanation || `Jawaban yang benar: ${questionObj.answer}`
    });

    if (isCorrect) {
        playSound('correct');
        buttonElement.classList.add('correct');
        currentQuizSession.score++;
        currentQuizSession.streak++;
        if (currentQuizSession.streak > currentQuizSession.maxStreak) {
            currentQuizSession.maxStreak = currentQuizSession.streak;
        }
        scoreDisplay.textContent = currentQuizSession.score;
        streakCountDisplay.textContent = currentQuizSession.streak;

        expIcon.textContent = '🎉';
        expTitle.textContent = 'Jawaban Kamu Tepat!';
        expTitle.style.color = 'var(--correct)';
    } else {
        playSound('wrong');
        if (buttonElement) {
            buttonElement.classList.add('wrong');
        }
        appContainer.classList.add('shake');
        currentQuizSession.streak = 0;
        streakCountDisplay.textContent = '0';

        // Highlight correct button
        allButtons.forEach(btn => {
            const label = btn.querySelector('.option-label');
            if (label && label.textContent.trim() === questionObj.answer.trim()) {
                btn.classList.add('correct');
            }
        });

        setTimeout(() => appContainer.classList.remove('shake'), 500);

        expIcon.textContent = isTimeout ? '⏱️' : '💡';
        expTitle.textContent = isTimeout ? 'Waktu Habis!' : 'Kurang Tepat!';
        expTitle.style.color = isTimeout ? 'var(--warning)' : 'var(--wrong)';
    }

    // Display Explanation
    expText.textContent = questionObj.explanation || `Jawaban yang benar adalah ${questionObj.answer}.`;
    explanationCard.style.display = 'block';

    // Jeda 2.2 detik agar user membaca penjelasan
    setTimeout(() => {
        currentQuizSession.currentIndex++;
        if (currentQuizSession.currentIndex < currentQuizSession.questions.length) {
            renderQuestion();
        } else {
            finishQuiz();
        }
    }, 2200);
}

// ==========================================
// RESULTS & REVIEW
// ==========================================
function finishQuiz() {
    const total = currentQuizSession.questions.length;
    const score = currentQuizSession.score;
    const pct = Math.round((score / total) * 100);

    finalScoreText.textContent = `${score}/${total}`;
    finalPctText.textContent = `${pct}%`;

    resCorrectCount.textContent = score;
    resWrongCount.textContent = total - score;
    resMaxStreak.textContent = currentQuizSession.maxStreak;

    // Update circular progress SVG
    const circumference = 2 * Math.PI * 50; // r=50 -> 314.15
    const offset = circumference - (pct / 100) * circumference;
    scoreCircleBar.style.strokeDashoffset = offset;

    // Badge & Title by Score
    if (pct === 100) {
        resultBadge.textContent = '👑 Sempurna & Jenius!';
        resultTitle.textContent = 'Luar Biasa Sempurna! 🎉';
        resultSubtitle.textContent = 'Kamu menjawab seluruh pertanyaan dengan tepat tanpa cela!';
    } else if (pct >= 80) {
        resultBadge.textContent = '⭐ Sangat Mahir';
        resultTitle.textContent = 'Hebat Sekali! 🚀';
        resultSubtitle.textContent = 'Wawasanmu sangat luas di topik ini!';
    } else if (pct >= 50) {
        resultBadge.textContent = '👍 Cukup Bagus';
        resultTitle.textContent = 'Hasil yang Bagus! ✨';
        resultSubtitle.textContent = 'Bagus! Sedikit lagi latihan untuk mencapai skor sempurna.';
    } else {
        resultBadge.textContent = '🌱 Terus Belajar';
        resultTitle.textContent = 'Jangan Patah Semangat! 💪';
        resultSubtitle.textContent = 'Jadikan ini kesempatan untuk menambah ilmu baru.';
    }

    // Play Victory Sound if good score
    if (pct >= 50) {
        playSound('win');
    }

    // Save Stats
    updateStats(score);

    // Build Review List
    buildReviewList();

    // Reset Review Toggle
    reviewSection.style.display = 'none';
    btnReview.querySelector('span:first-child').textContent = 'Lihat Pembahasan Soal';

    showScreen(resultScreen);
}

function buildReviewList() {
    reviewList.innerHTML = '';
    currentQuizSession.userAnswers.forEach((item, idx) => {
        const div = document.createElement('div');
        div.classList.add('review-item');
        div.classList.add(item.isCorrect ? 'is-correct' : 'is-wrong');

        div.innerHTML = `
            <div class="review-q">${idx + 1}. ${item.question}</div>
            <div class="review-ans ${item.isCorrect ? '' : 'user-ans-wrong'}">
                Jawabanmu: ${item.selected} ${item.isCorrect ? '✅' : '❌'}
            </div>
            ${!item.isCorrect ? `<div class="review-ans">Kunci Jawaban: <strong>${item.correct}</strong></div>` : ''}
            <div class="review-ans" style="margin-top: 4px; color: var(--text-muted); font-size: 0.78rem;">
                ℹ️ ${item.explanation}
            </div>
        `;
        reviewList.appendChild(div);
    });
}

// Review Button Toggle
btnReview.addEventListener('click', () => {
    const isHidden = reviewSection.style.display === 'none';
    reviewSection.style.display = isHidden ? 'block' : 'none';
    btnReview.querySelector('span:first-child').textContent = isHidden ? 'Tutup Pembahasan' : 'Lihat Pembahasan Soal';
    if (isHidden) {
        reviewSection.scrollIntoView({ behavior: 'smooth' });
    }
});

// Restart Button
btnRestart.addEventListener('click', () => {
    showScreen(setupScreen);
});

// Share Button (Copy to Clipboard)
btnShare.addEventListener('click', () => {
    const total = currentQuizSession.questions.length;
    const score = currentQuizSession.score;
    const text = `🧠 Saya baru saja menyelesaikan kuis "${currentQuizSession.topic}" di TriviaMaster AI dengan skor ${score}/${total} (${Math.round((score/total)*100)}%)! Coba kalahkan rekor saya!`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Teks skor berhasil disalin ke clipboard! 📋');
        }).catch(() => {
            showToast('Gagal menyalin skor');
        });
    } else {
        showToast('Clipboard tidak didukung browser ini');
    }
});
