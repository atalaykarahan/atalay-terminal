# Çalışma süresi, XP, level ve rütbeler — plan

Amaç: arkadaşlar birbirinin ne kadar çalıştığını ve level'ını görsün; ileride rozet ve başarımlar gelsin. Erken
aşama bir proje için: basit, dürüst, hile yapması zor ve insanları fazla mesaiye itmeyen bir sistem. Uygulamadaki
bütün metinler (rütbeler, süreler, bildirimler) **İngilizce**.

Kararlar (2026-10-26):
- Haftalık hedef 3 gün.
- Level atlama arkadaşlara bildirim olarak gitmez, sadece profilde görünür; kullanıcıya MMO tarzı bir tebrik gelir.
- Level eğrisi WoW gibi: başta hızlı, sonra giderek zorlaşan.
- Rütbeler Naruto'dan.

## 1. Neyi ölçüyoruz: "aktif çalışma dakikası"

Token sayısı kullanmıyoruz:
- Kullanıcıların tokenlarını okumak istemiyoruz (gizlilik).
- Token pahalı modeli seveni ödüllendirir, emeği değil.
- Sağlayıcıya göre değişir (Claude, Codex, Gemini).

Codex ve Gemini de yerel kayıt tutuyor (`~/.codex/sessions/...jsonl`, Gemini'de `/stats`), ama onları okumak hem
gizlilik hem bakım yükü.

Onun yerine **araçtan bağımsız aktif süre** ölçüyoruz; WakaTime'ın kalp atışı (heartbeat) modeli gibi:

- Uygulama zaten **dakikada bir heartbeat** atıyor. Bu atışa tek bir `active: true/false` bilgisi eklenir.
- Bir dakika ancak iki koşul birden doğruysa **aktif** sayılır:
  1. Kullanıcı AFK değil: Mac'te son 5 dakikada klavye ya da fare kullanılmış (zaten ölçüyoruz, HIDIdleTime).
  2. Çalışma sinyali var: son 5 dakikada bir Claude sohbeti çalışmış, ya da bir terminalde komut koşmuş (npm,
     flutter, `codex`, `gemini`… hepsi sayılır), ya da kullanıcı bir sohbet ya da terminal penceresine yazmış.
- WakaTime da benzerini yapıyor: atışları birleştirip süre çıkarıyor, 15 dakika hareketsizlikte oturumu kesiyor.
- Bu tanımın iki faydası var:
  - YouTube izlemek ya da mouse jiggler tek başına XP getirmez, çünkü çalışma sinyali gerekir.
  - Codex ya da Gemini kullanan da, bizim terminalimizde çalıştığı sürece aynı adil şekilde XP kazanır.
- Hesap **sunucuda** yapılır:
  - Her atış en fazla 90 sn kredi verir, aradaki boşluk 3 dakikayı geçerse sadece 60 sn.
  - İstemci süre göndermez, sadece "aktifim" der.
  - Hileye karşı (uygulama açık kaynak, isteği elle gönderen de olabilir): süre sadece uygulamanın canlı bağlantısı
    açıkken ve AFK değilken sayılır; günde en fazla 10 saat sayılır; saat dilimi günde en fazla bir kez değişir
    (değiştirip fazladan gün ve günlük bonus yaratılamaz).

## 2. XP kuralları

| Kural | Değer | Neden |
|---|---|---|
| Temel | 1 aktif dakika = 1 XP | Anlaşılır: 1 saat = 60 XP |
| Günün ilk 2 saati | **×2** ("Rested" bonusu, WoW'daki gibi) | Bonusu ödül olarak sun, ceza olarak değil. Her gün gelmeyi ödüllendirir, maratonu değil |
| Günde 8–10 aktif saat arası | ×0.5; 10 saatten sonrası sayılmaz | Fazla mesaiyi ve 7/24 XP kasmayı engeller |
| Günlük giriş | Günün ilk aktif dakikasında otomatik +50 XP | "Claim" butonu koymuyoruz (aşağıda neden) |
| Haftalık seri | Haftada **≥ 3 aktif gün** (günde ≥ 30 dk) = 1 hafta; her ardışık hafta +%10 XP, en fazla +%50 | Günlük seri hafta sonu çalışmaya iter (GitHub seri sayacını kaldırınca hafta sonu aktivitesi düştü). 3 günlük hedef hafif ama düzenli |
| Tatil ve hastalık | Seriyi 30 güne kadar dondurma (Apple'ın halka duraklatması gibi) | Seri kaygısıyla çalışmayı önler |

Günde 2 aktif saat çalışan biri yaklaşık 290 XP, 4 saat çalışan yaklaşık 410 XP kazanır (bonuslarla).

**Claim mi, otomatik mi?** Claim butonu mobil oyun tekniği: geri dönüşü artırıyor, ama kayıp korkusuna (loss
aversion) dayanıyor. Geliştirici aracında saygılı olan otomatik vermek. Sevinç anını küçük bir "+50 XP · daily
bonus" bildirimiyle veriyoruz; claim'in etkisi kalıyor, zorlaması gidiyor.

## 3. Level eğrisi: WoW Classic'ten

WoW Classic'te level 1'den 2'ye 400 XP gerekiyor, 59'dan 60'a 209.800 XP; toplam 4,08 milyon. Erken level'lar için
formülü `40 × (L² + 9L)`. Aynı şekli bizim dakika tabanlı ekonomimize ölçekliyoruz (WoW'un sayıları ÷ 18):

**Bir sonraki level için gereken XP = 2,2 × (L² + 9L)** (10'a yuvarlanır). **Son seviye 60**, WoW Classic gibi.
Sonrası için ileride "prestige" eklenebilir.

| Level | Sonraki level için | Toplam XP | Günde 2 saat | Günde 4 saat |
|---|---|---|---|---|
| 2 | 50 | 20 | ilk 10 dk | ilk 10 dk |
| 5 | 150 | 260 | 1. gün | 1. gün |
| 10 | 420 | 1.520 | ~5 gün | ~4 gün |
| 15 | 790 | 4.310 | ~2 hafta | ~11 gün |
| 20 | 1.280 | 9.190 | ~1 ay | ~3 hafta |
| 25 | 1.870 | 16.720 | ~2 ay | ~6 hafta |
| 30 | 2.570 | 27.430 | ~3 ay | ~2 ay |
| 40 | 4.310 | 60.630 | ~7 ay | ~5 ay |
| 50 | 6.490 | 113.190 | ~13 ay | ~9 ay |
| 60 (son) | — | 189.510 | ~1,8 yıl | ~1,3 yıl |

Tam MMO hissi: ilk gün 4–5 level atlanır, ilk ayda 20'ye gelinir, sonrası aylar sürer.

## 4. Rütbeler: Naruto

**Naruto mu, Attack on Titan mı?**
- **Naruto** bize daha uygun:
  - Rütbeleri açıkça bir yetenek merdiveni: akademiden Kage'ye.
  - "Gölgede çalışan ninja" fikri hacker temasıyla örtüşüyor; Kage zaten "gölge" demek.
  - Genin, Chunin ve Jonin tarihte gerçek ninja rütbeleri. Bunlar kimsenin markası değil, Japonca kelimeler.
- **Attack on Titan'ın** rütbeleri sıradan askeri unvanlar (Cadet, Soldier, Squad Leader, Captain, Commander):
  - Hem ayırt edici değiller hem de tema hayatta kalma ve savaş.
  - Karıştırmak (AoT'tan "Cadet" ile başlayıp Kage'ye çıkmak) iki evreni birbirine katar ve kafa karıştırır.

**Kaç rütbe?** Valorant'ta 8 kademe var, League'de 10. 60 level için **7 rütbe** ideal: ilk rütbeler hızlı gelir,
son ikisi uzun hedef olur.

| Rütbe | Level | Ne zaman (günde 2–4 saat) |
|---|---|---|
| Academy Student | 1–4 | ilk gün |
| Genin | 5–14 | ilk 2 hafta |
| Chunin | 15–24 | 2. hafta – 2. ay |
| Jonin | 25–34 | 2. – 5. ay |
| ANBU | 35–44 | 5. – 10. ay |
| Sannin | 45–54 | 10. ay – 1,5 yıl |
| Kage | 55–60 | 1–1,5 yıldan sonra |

Naruto'ya özgü unvanlardan kaçınıyoruz ("Hokage" yerine "Kage"). Her rütbenin kendi rengi ve küçük bir alın
bandı (headband) rozeti olur; ninja alın bandı, kendi logomuzla çizilir.

## 5. Arayüz (metinler İngilizce)

- **İsim yanında:** arkadaş listesi, sohbet başlığı ve üst barda kendi adında `Lv 23 · Chunin`; rütbe renginde
  küçük bir rozet.
- **Profil kartı:** arkadaşa tıklayınca açılır. Level ve rütbe; "Active today 2h 40m"; "This week 2/3 days";
  "Total 120h".
- **Kendi XP çubuğun (ana menü):** "Level 23 · Chunin · 1,240 / 1,620 XP", altında "Rested: 1h 20m left at 2×".
- **Arkadaş listesi:** her arkadaşın yanında "today 2h 40m". Bu görünürlük kapatılabilir: Settings → "Show my
  active time to friends".
- **Level atlama, sadece kendine, MMO tarzı:**
  - Ekranın ortasında kısa bir parlama: **"LEVEL UP — You reached level 24"**, ve bir fanfar sesi (sfx.js'te
    sentezlenir, WoW'daki ding gibi).
  - Rütbe değişince daha büyük bir kutlama: **"RANK UP — You are now a Jonin"**, alın bandının belirdiği bir
    animasyonla.
  - Arkadaşlara bildirim gitmez; yeni level profillerinde görünür.
- **Görünmez durumdakiler:** XP kazanmaya devam eder, ama arkadaşlar canlı süresini görmez.

## 6. Rozetler ve başarımlar (2. aşama)

Strava gibi kademeli, bazıları sürpriz (gizli) ve hepsi sağlıklı çalışmayı ödüllendiren; 15–20 tane ile başlarız.
İsimler İngilizce:

- **Kilometre taşı:** First Hour · 10 / 100 / 1,000 Hours · Rank badges
- **Seri:** 4 / 12 / 52 hafta üst üste haftalık hedef (Steady, Disciplined, Unbreakable)
- **Odak:** Deep Work (90 dakika kesintisiz) · Focus Week (bir haftada 10 odak oturumu)
- **Zaman (gizli):** Night Owl (00–04 arası aktif) · Early Bird (05–08) · Weekend Warrior. Bunlar az ve sürpriz
  olmalı, saatleri teşvik etmemeli.
- **Araç:** Multitasker (aynı anda 3 terminal) · Explorer (10 farklı proje klasörü) · First Parking
- **Sosyal:** First Friend · Squad of Five · Co-op (arkadaşınla aynı saatte çalışmak)

GitHub'ın başarımlarından ders: "ne anlama geldiği belli olmayan" rozetler işe yaramıyor. Her rozetin açıklaması net
olmalı ve profilde seçilen 3 rozet sergilenmeli (Steam gibi). Rozetler sunucuda tanımlanır.

## 7. Sıralama (3. aşama, isteğe bağlı)

Sadece arkadaşlar arasında, haftalık XP sıralaması; her pazartesi sıfırlanır (Duolingo ligleri gibi). Küresel tablo
yok; araştırmalar küresel sıralamanın stres ve tükenmişlik yarattığını gösteriyor.

## 8. Teknik plan

**API (migration 007):**
- `activity_days(device_id, day, active_seconds, xp, primary key(device_id, day))`. `day`, kullanıcının yerel
  günü; heartbeat saat dilimi farkını da gönderir.
- `devices.total_xp`, `devices.last_active_at`, `devices.show_activity`.
- Heartbeat'e `active` ve `tz` eklenir; kredi, XP ve level kuralları sunucuda işlenir. Level atlanınca sadece
  kullanıcının kendi soketine `level` olayı gider (rütbe değiştiyse rütbe de).
- `/v1/social` cevabında her arkadaş için `level`, `rank` ve `todayActive` (gösterim açıksa) olur.
- 2. aşamada: `achievements(device_id, key, unlocked_at)` ve kural tablosu.

**Uygulama:**
- "Çalışma sinyali": son 5 dakikada Claude çalıştı mı, terminalde iş koştu mu, pencerelere yazıldı mı. Bunların
  hepsini zaten biliyoruz (orbit, terminal arabaları, AFK izleyicisi).
- Arayüz: level rozeti, profil kartı, XP çubuğu, level ve rütbe atlama kutlaması (bildirim altyapısı ve sfx hazır).

**Süre tahmini:**
- 1. aşama (aktif süre, XP, level, rütbe, profil, kutlama): 2–3 gün
- 2. aşama (rozetler): 1–2 gün
- 3. aşama (haftalık sıralama): 1 gün

## 9. Erken aşama için öneriler

- Önce 1. aşamayı çıkar, 2–3 hafta ölç: günlük ve haftalık aktif kullanıcı, 7. gün tutunması. Rozetleri ondan
  sonra ekle.
- Karanlık desenlerden kaçın: parayla seri dondurma, "serin kaybolacak!" baskı bildirimleri, claim zorunluluğu yok.
- Dışsal ödül, içsel motivasyonu zamanla ezebilir (overjustification). XP "çalış" değil "geri gel ve düzenli ol"
  mesajı vermeli. Bu yüzden günlük tavan, Rested bonusu ve haftalık seri var.
- Kural basit kalsın, Duolingo da seriyi sadeleştirince büyüdü: "Aktif çalıştığın her dakika 1 XP, günün ilk iki
  saati çift."

## Kaynaklar

- [WoW Classic: level başına XP tablosu](https://warcraft.wiki.gg/wiki/Experience_to_level) ·
  [WoW Classic'te 60'a ulaşma süresi](https://warcrafttavern.com/wow-classic/guides/how-long-to-60)
- [WoW rested XP ve çerçeveleme](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/) ·
  [Rested XP detayları](https://icy-veins.com/wow/rested-xp-a-detailed-overview)
- [Naruto ninja rütbeleri](https://deltiasgaming.com/?p=140346) ·
  [Tarihsel ninja rütbeleri: jonin, chunin, genin](https://eastkingdomgazette.org/2022/04/27/as-research-paper-32-the-historical-ninja-casting-light-on-the-shadows/)
- [Attack on Titan birlikleri ve rütbeleri](https://fictionhorizon.com/all-attack-on-titan-units-and-regiments-explained/)
- [Valorant rütbe kademeleri](https://playvalorant.com/en-gb/news/dev/valorant-ranks-and-competitive-matchmaking/)
- [WakaTime FAQ: heartbeat ve 15 dk zaman aşımı](https://wakatime.com/faq)
- [Duolingo: seriler alışkanlığı nasıl kuruyor](https://blog.duolingo.com/how-duolingo-streak-builds-habit) ·
  [Duolingo seri ve dondurma mekaniği](https://duolingo.deconstructoroffun.com/mechanics/streaks) ·
  [Duolingo vaka çalışması](https://softwareandsynapses.substack.com/p/duolingo-an-actionable-case-study)
- [Gamification yanlış kullanımı: Duolingo nitel çalışma (arXiv)](https://arxiv.org/pdf/2203.16175)
- [XP eşiklerini tanımlamak (Game Developer)](https://www.gamedeveloper.com/design/quantitative-design---how-to-define-xp-thresholds-) ·
  [RPG level ilerleme matematiği](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/)
- [Steam level ve rozetleri](https://www.pcgamer.com/uk/5-easy-ways-to-level-up-your-steam-profile)
- [Strava gamification](https://www.strivecloud.io/blog/app-engagement-strava) ·
  [Strava tasarım eleştirisi](https://ixd.prattsi.org/2025/09/design-critique-strava-ios-app-2/)
- [Apple Watch: halkaları duraklatmak](https://www.imore.com/health-fitness/apple-watch/how-to-pause-activity-streaks-in-watchos-11)
- [Haftalık ve günlük seri (Product Hunt tartışması)](https://www.producthunt.com/p/general/do-streaks-build-habits-or-just-delay-churn)
- [GitHub'da gamification'ın etkisi (ICSE 2021)](https://neverworkintheory.org/2021/10/03/how-gamification-affects-software-developers.html) ·
  [GitHub başarımları üzerine çalışma](https://arxiv.org/html/2303.14702v3)
- [Platform işinde gamification ve tükenmişlik (Eurofound)](https://www.eurofound.europa.eu/de/publications/all/platform-work-gamification) ·
  [Gamification tuzakları](https://blog.learnamp.com/pitfalls-of-gamification)
- [Mouse jiggler tespiti](https://www.timedoctor.com/blog/how-to-trick-employee-monitoring-software/)
- [Günlük giriş ödülleri ve tutunma](https://game-wisdom.com/general/xp-logging-age-daily-gaming-habits)
- [Başarım tasarımı türleri (Google Play Games)](https://developer.android.com/games/pgs/achievements?hl=en) ·
  [RetroAchievements tasarım rehberi](https://docs.retroachievements.org/Achievement-Design/)
- [Forest: odak süresi ödülü](https://apps.apple.com/au/app/forest-focus-for-productivity/id866450515)
- [Codex CLI oturum kayıtları](https://codex.danielvaughan.com/2026/06/01/codex-cli-session-history-local-search-rollout-format-knowledge-mining/) ·
  [Gemini CLI kullanım istatistikleri](https://wpreset.com/how-to-check-gemini-cli-and-api-usage/)
