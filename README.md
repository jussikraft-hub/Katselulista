# 🎬 Katselulista – Leffat & Sarjat

Visuaalinen, mobiili- ja iPad-optimoitu elokuvien ja TV-sarjojen katselulistasovellus (PWA) julistekuvilla, TVMaze-pikahaulla ja Dropbox-synkronoinnilla.

## Ominaisuudet
- **Cinematic Dark Mode:** Musta OLED-teema, 2:3 julistekortit ja alustatunnisteet.
- **Suodatus:** Kaikki, ⏳ Kesken, 🍿 Katselulistalla ja ✅ Katsotut.
- **Alustat:** Apple TV+, Netflix, Prime Video, HBO Max, Disney+, Yle Areena.
- **Tietojen haku:** TVMaze API -automaattihaku (hakee julisteet, vuoden, genret ja kuvauksen automaattisesti).
- **Pilvisynkka & Varmuuskopiot:** Dropbox API -tuki (`katselulista.json`), JSON-tuonti/vienti ja Obsidian Markdown -kopiointi.
- **PWA-valmis:** Voidaan lisätä iPhonen ja iPadin Koti-valikkoon natiivisovelluksen tavoin.

## Käyttö Macilla
```bash
python3 server.py
```
Avaa selaimessa: `http://localhost:8088` tai puhelimella samassa lähiverkossa `http://<oma-ip>:8088`.
