import SiteNavbar from "./components/SiteNavbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6d93b] text-black">
      

      <main className="w-full px-4 py-8 md:max-w-6xl md:mx-auto space-y-8">
        <section className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
          <div className="bg-[#101010] text-white rounded-3xl p-8 min-h-[360px] flex flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-300 mb-4">
                English Time
              </p>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Şimdi İngilizce
                <span className="text-yellow-300"> Zamanı!</span>
              </h1>
              <p className="mt-6 text-white/80 max-w-xl text-lg leading-8">
                Günün kelimeleri, seviyene uygun metinler, speaking club duyuruları
                ve sınıf içeriklerine tek yerden ulaş.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#daily-texts"
                className="rounded-full bg-yellow-300 text-black px-6 py-3 font-bold hover:bg-yellow-400 transition"
              >
                Günün Metnini İncele
              </a>
              <a
                href="/login"
                className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10 transition"
              >
                Giriş Yap
              </a>
            </div>
          </div>

          <div className="bg-[#fff8d9] border border-black/15 rounded-3xl p-6 min-h-[360px]">
            <h2 className="text-2xl font-bold mb-4">Bugün Neler Var?</h2>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-black/10 p-4">
                <p className="text-sm text-black/60">Duyuru</p>
                <p className="font-bold mt-1">Speaking Club Cuma 19:30</p>
                <p className="text-sm text-black/70 mt-2">
                  Katılım için öğretmeninizin yönlendirmesini takip edin.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/10 p-4">
                <p className="text-sm text-black/60">Günün Kelimesi</p>
                <p className="font-bold mt-1 text-xl">Improve</p>
                <p className="text-sm text-black/70 mt-2">
                  To make something better.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-black/10 p-4">
                <p className="text-sm text-black/60">Günün Metni</p>
                <p className="font-bold mt-1">B1 Reading Practice</p>
                <p className="text-sm text-black/70 mt-2">
                  Seviyene göre kısa okuma metinlerini incele.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="announcements" className="bg-[#fff8d9] border border-black/15 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">Duyurular</h2>
          <p className="text-black/70 mb-6">
            Kurs ve sınıf duyurularını buradan takip edebilirsin.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <h3 className="font-bold">Speaking Club</h3>
              <p className="text-sm text-black/70 mt-2">
                Bu hafta speaking club etkinliği cuma günü yapılacaktır.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <h3 className="font-bold">Worksheet Submission</h3>
              <p className="text-sm text-black/70 mt-2">
                Worksheet teslim tarihlerini kaçırmamayı unutmayın.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <h3 className="font-bold">Weekly Quiz</h3>
              <p className="text-sm text-black/70 mt-2">
                Haftalık quizler student panel üzerinden aktif olacaktır.
              </p>
            </div>
          </div>
        </section>

        <section id="daily-words" className="bg-[#fff8d9] border border-black/15 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">Günün Kelimeleri</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <p className="text-2xl font-bold">Improve</p>
              <p className="text-sm text-black/60 mt-1">to make better</p>
              <p className="mt-3 text-sm">I want to improve my English.</p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <p className="text-2xl font-bold">Practice</p>
              <p className="text-sm text-black/60 mt-1">to do again and again</p>
              <p className="mt-3 text-sm">You should practice every day.</p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5">
              <p className="text-2xl font-bold">Confident</p>
              <p className="text-sm text-black/60 mt-1">feeling sure</p>
              <p className="mt-3 text-sm">She feels confident in speaking.</p>
            </div>
          </div>
        </section>

        <section id="daily-texts" className="bg-[#fff8d9] border border-black/15 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">Günün Metni</h2>
          <p className="text-black/70 mb-6">
            Seviyene uygun kısa İngilizce metinleri buradan açabilirsin.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
              <div
                key={level}
                className="rounded-2xl bg-white border border-black/10 p-5 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <p className="text-xl font-bold">{level}</p>
                <p className="text-sm text-black/60 mt-2">
                  Bu seviye için günlük okuma metni
                </p>
                <button className="mt-4 rounded-full bg-yellow-300 px-4 py-2 text-sm font-bold hover:bg-yellow-400 transition">
                  Metni Aç
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="activities" className="bg-[#fff8d9] border border-black/15 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">Speaking Club & Sınıflar</h2>
          <p className="text-black/70 mb-6">
            Buraya speaking club günleri, sınıf bilgileri ve etkinlik kartları ekleyebilirsin.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-black/10 p-5 min-h-[180px]">
              <h3 className="font-bold text-lg">Speaking Club</h3>
              <p className="text-sm text-black/70 mt-3">
                Cuma - 19:30
              </p>
              <p className="text-sm text-black/70 mt-2">
                B1 / B2 öğrencileri
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5 min-h-[180px]">
              <h3 className="font-bold text-lg">California Class</h3>
              <p className="text-sm text-black/70 mt-3">
                B2 sınıfı için özel worksheet ve quiz içerikleri
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 p-5 min-h-[180px]">
              <h3 className="font-bold text-lg">Weekly Event</h3>
              <p className="text-sm text-black/70 mt-3">
                Her hafta yeni okuma ve kelime çalışmaları
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}