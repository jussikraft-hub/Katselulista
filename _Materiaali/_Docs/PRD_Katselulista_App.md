---
name: PRD_Katselulista_App
description: >-
  Suunnitelma ja tuotespesifikaatio mobiili- ja iPad-optimoitua elokuvien ja sarjojen katselusovellusta varten.
domain: Personal
stage: 2_PLAN
status: DRAFT
created: 2026-10-31
updated: 2026-10-31
---

# PRD: Katselulista – Elokuvat & Sarjat (Cinematic Mobile/iPad Web App)

## 1. Johdanto ja Tavoite

Tämän projektin tavoitteena on luoda visuaalisesti ensiluokkainen, helppokäyttöinen ja responsiivinen **Katselulista-sovellus** (Web App / PWA), joka on optimoitu erityisesti iPhonelle ja iPadille (sekä toimii sulavasti Macilla).

Sovelluksen avulla Jussi voi:
1. Selata leffoja ja sarjoja visuaalisina julistekortteina (Posters, genret, alustat, näyttelijät, arviot).
2. Nähdä heti mitä on **Kesken** (esim. *Sugar*, *Siilo*, *Fallout*), mitä **Katselulistalla** (*East of Eden*) ja mitä jo **Katsottu**.
3. Lisätä uusia elokuvia ja sarjoja helposti kännykällä ilman raskasta näpyttelyä (automaattinen kuvien ja tietojen nouto tai nopea manuaalilisäys).
4. Tallentaa sovelluksen iPhonen ja iPadin Koti-valikkoon natiivisovelluksen tavoin (PWA-tuki, Add to Home Screen).

---

## 2. Kohdelaitteet ja Käyttökokemus (UX)

### 2.1 iPhone & iPad -optimointi
- **Mobile First & Kosketus:** Isot kosketusalueet, sujuva sormiskrollaus, Bottom Bar -navigointi kännykällä ja tilava grid iPadilla/Macilla.
- **PWA (Progressive Web App):**
  - Web App Manifest (`manifest.json`) ja iOS-metatagit (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`).
  - Mahdollisuus tallentaa laitteen Koti-valikkoon tyylikkäällä leffa-ikonilla ilman selaimen osoitepalkkia.
- **Offline-valmius:** Sovellus tallentaa tiedot selaimeen (`localStorage` / `IndexedDB`), joten se toimii salamannopeasti myös ilman verkkoyhteyttä.

### 2.2 Visuaalinen Teema (Cinematic Dark Mode)
- **Värimaailma:**
  - Tausta: `#0b0e14` (syvä tummansininen / musta)
  - Kortit ja paneelit: `#151b26` / `#1c2433` hienovaraisella reunuksella (`border: 1px solid rgba(255,255,255,0.08)`)
  - Korostusvärit (Platformit):
    - Apple TV+: `#000000` / vaaleanharmaa badge
    - Netflix: `#E50914` punainen
    - Prime Video: `#00A8E1` sininen
    - HBO Max: `#9900FF` violetti
    - Disney+: `#113CCF`
  - Aksentti & Tähdet: `#E2B616` (lämmin kulta) ja `#00B4D8` (elokuvamainen syaani)
- **Korttinäkymä:** 2:3 kuvasuhteen leffajulisteet pyöristetyillä kulmilla (`rounded-xl`), laadukkaalla varjostuksella ja status-merkillä (Kesken / Listalla / Katsottu).

---

## 3. Pääominaisuudet

### 3.1 Päänäkymä ja Suodatus
- **Pikatilat (Tabs / Pills):**
  - 🎬 **Kaikki**
  - ⏳ **Kesken** (esim. *Sugar*, *Siilo*, *Fallout*)
  - 🍿 **Katselulistalla** (esim. *East of Eden*)
  - ✅ **Katsotut**
- **Alustasuodatus:** Suodata napinpainalluksella (Apple TV+, Netflix, Prime Video, Yle Areena jne.).
- **Tekstihaku:** Reaaliaikainen haku nimen, näyttelijän tai genren perusteella.

### 3.2 Yksityiskohtakortti (Detail Modal / Drawer)
Korttia napauttamalla aukeaa tyylikäs modaali tai alhaalta nouseva paneeli:
- Iso kansikuva / taustakuva (Backdrop)
- Otsikko, alkuperäisnimi ja julkaisuvuosi
- Formaatti: Elokuva tai Sarja (ja katsottu tuotantokausi, esim. "Kausi 1 katsottu")
- Alusta ja suora linkki (esim. Wikipedia, IMDb, striimauspalvelu)
- Genre-tagit ja kesto/jaksomäärä
- Näyttelijät ja ohjaaja/luoja
- Juonitiivistelmä (Synopsis)
- Omat muistiinpanot ja oma tähtiarvio (1–5 tähteä)
- Pikapainikkeet tilan vaihtamiseen (*Merkitse katsotuksi*, *Siirrä kesken oleviin*, *Muokkaa*, *Poista*)

### 3.3 Uuden Nimikkeen Lisäys
- **Älykäs haku:** Käyttäjä kirjoittaa teoksen nimen $\rightarrow$ sovellus hakee ilmaisen avoimen elokuvatietokannan (esim. ilmainen TMDb API tai OMDb / Wikipedia) kautta valmiin julistekuvan, vuosiluvun, näyttelijät ja kuvauksen automaattisesti.
- **Pikalisäys käsin:** Mahdollisuus syöttää nopeasti nimi, alusta ja liittää kuvalinkki.

### 3.4 Datan Pysyvyys ja Synkronointi
1. **Paikallinen tallennus (`localStorage`):** Kaikki muutokset tallentuvat heti selaimen muistiin.
2. **Kaksisuuntainen tiedostotuki:**
   - *Tuo katselulista*: Sovelluksessa on nappi *"Tuo Markdown/JSON"*, jolla nykyinen `Katselulista.md` latautuu suoraan sovellukseen.
   - *Vie Markdowniksi*: Nappi *"Kopioi Markdownina"*, jolla päivitetyn tilanteen voi heittää suoraan Obsidianiin.
3. **Paikallisverkko (LAN):** Voidaan ajaa myös Macin paikallisen Python-palvelimen kautta, jolloin samaa osoitetta (esim. `http://192.168.x.x:8080`) voidaan käyttää puhelimella ja iPadilla samassa Wi-Fi-verkossa.

---

## 4. Tekninen Arkkitehtuuri

| Komponentti | Valinta | Perustelu |
| :--- | :--- | :--- |
| **Frontend** | Itsenäinen Single Page Application (HTML5 + Tailwind CSS v4 + Vanilla JS tai React) | Ei vaadi raskasta palvelinta; toimii suoraan selaimessa tai tiedostona |
| **UI-komponentit** | Moderni Cinematic Dark UI, Lucide SVG -ikonit | Kevyt, huipputyylikäs ja viiveetön kosketuskäyttö |
| **Metatiedot & Kuvat** | TMDb API / Wikimedia / OMDb API (tai valmiiksi esiladatut korkearesoluutioiset julisteet) | Takaa upeat leffajulisteet ja tarkan tiedon |
| **Tallennus** | `localStorage` + JSON Import/Export + Markdown-synkka | 100 % offline-tuki ilman tietokanta-asennuksia |
| **Jakelu** | PWA (Progressive Web App) | Voidaan asentaa iPhonen ja iPadin kotivalikkoon |

---

## 5. Toteutusvaiheet (5-vaiheinen elinkaari)

1. **Vaihe 1: Ideointi & Vaatimukset (`STAGE:1_IDEA`)** $\rightarrow$ *Hyväksytty (Ideapankki & Katselulista luotu).*
2. **Vaihe 2: Suunnittelu & PRD (`STAGE:2_PLAN`)** $\rightarrow$ *Tämä dokumentti.*
3. **Vaihe 3: Toteutus (`STAGE:3_PROD`)**
   - Luodaan sovelluksen tiedostot (`index.html`, `app.js`, `style.css`, `manifest.json`).
   - Upotetaan nykyiset aloituskohteet (*Sugar*, *Siilo*, *Fallout*, *East of Eden*) aidoilla virallisilla julistekuvilla ja tiedoilla.
   - Toteutetaan kosketusystävällinen grid, suodattimet, hakutoiminto ja yksityiskohtamodaali.
   - Lisätään uuden kohteen syöttölomake ja kuvalinkitys.
4. **Vaihe 4: Testaus & Mobiilivalidointi (`STAGE:4_POST`)**
   - Testataan iPhone- ja iPad-näkymät, responsiivisuus, teemat ja `localStorage`-tallennus.
   - Luodaan kevyt paikallinen käynnistysskripti (`start_app.py` tai `run.sh`), joka näyttää lähiverkon osoitteen ja QR-koodin puhelimelle.
5. **Vaihe 5: Auditointi & Toimitus (`STAGE:5_AUDIT`)**
   - Varmistetaan koodin syntaksi (`node -c`), regressiot ja siisteys.
   - Luodaan selkeä käyttöohje.

---

## 6. Aloitustiedot (Seed Data)

Sovellukseen esiasennetaan heti valmiiksi Jussin mainitsemat nimikkeet:
1. **Sugar (Apple TV+)** – Tila: *Kesken* (Kausi 1) | Julistekuva mukana
2. **Siilo / Silo (Apple TV+)** – Tila: *Kesken* (Kausi 1–2) | Julistekuva mukana
3. **Fallout (Prime Video)** – Tila: *Kesken* (Kausi 1 katsottu, odottaa Kautta 2) | Julistekuva mukana
4. **East of Eden (Netflix)** – Tila: *Katselulistalla* (Minisarja 2026) | Julistekuva mukana
