export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
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
                className="rounded-full px-6 py-3 font-bold transition border border-black"
                style={{ backgroundColor: "var(--bg-button)", color: "var(--text-main)" }}
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

          <div
            className="border border-black/15 rounded-3xl p-6 min-h-[360px]"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <h2 className="text-2xl font-bold mb-4">Bugün Neler Var?</h2>

            <div className="space-y-4">
              <div
                className="rounded-2xl border border-black/10 p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  Duyuru
                </p>
                <p className="font-bold mt-1">Speaking Club Cuma 19:30</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                  Katılım için öğretmeninizin yönlendirmesini takip edin.
                </p>
              </div>

              <div
                className="rounded-2xl border border-black/10 p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  Günün Kelimesi
                </p>
                <p className="font-bold mt-1 text-xl">Improve</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                  To make something better.
                </p>
              </div>

              <div
                className="rounded-2xl border border-black/10 p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  Günün Metni
                </p>
                <p className="font-bold mt-1">B1 Reading Practice</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                  Seviyene göre kısa okuma metinlerini incele.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="announcements"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Duyurular</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            Kurs ve sınıf duyurularını buradan takip edebilirsin.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Speaking Club</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                Bu hafta speaking club etkinliği cuma günü yapılacaktır.
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Worksheet Submission</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                Worksheet teslim tarihlerini kaçırmamayı unutmayın.
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Weekly Quiz</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                Haftalık quizler student panel üzerinden aktif olacaktır.
              </p>
            </div>
          </div>
        </section>

        <section
          id="daily-words"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Günün Kelimeleri</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Improve</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                to make better
              </p>
              <p className="mt-3 text-sm">I want to improve my English.</p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Practice</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                to do again and again
              </p>
              <p className="mt-3 text-sm">You should practice every day.</p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Confident</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                feeling sure
              </p>
              <p className="mt-3 text-sm">She feels confident in speaking.</p>
            </div>
          </div>
        </section>

        <section
          id="daily-texts"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Günün Metni</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            Seviyene uygun kısa İngilizce metinleri buradan açabilirsin.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
              <div
                key={level}
                className="rounded-2xl border border-black/10 p-5 hover:shadow-md hover:-translate-y-0.5 transition"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-xl font-bold">{level}</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                  Bu seviye için günlük okuma metni
                </p>
                <button
                  className="mt-4 rounded-full px-4 py-2 text-sm font-bold transition border border-black"
                  style={{ backgroundColor: "var(--bg-button)", color: "var(--text-main)" }}
                >
                  Metni Aç
                </button>
              </div>
            ))}
          </div>
        </section>

        <section
          id="activities"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Speaking Club & Sınıflar</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            Buraya speaking club günleri, sınıf bilgileri ve etkinlik kartları ekleyebilirsin.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">Speaking Club</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                Cuma - 19:30
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                B1 / B2 öğrencileri
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">California Class</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                B2 sınıfı için özel worksheet ve quiz içerikleri
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">Weekly Event</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                Her hafta yeni okuma ve kelime çalışmaları
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}