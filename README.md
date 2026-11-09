# ⚙️ Primul motor electric

Aplicație interactivă pentru **Fizica distractivă 06 — Primul motor electric**: experiența lui Oersted (galvanometrul din busolă), șinele pe care sârma alunecă singură și motorul homopolar. Fără biblioteci externe, fără internet: dublu-click pe `index.html`.

Experimentele vin din Virgil Atanasiu, *Fizica distractivă*, E.D.P. București, 1964 — „Galvanometru dintr-o busolă" (p. 210) și „Principiul motorului electric" (p. 220). Varianta de „motor elementar" din carte (p. 221) funcționează cu **mercur**; a fost înlocuită aici cu **motorul homopolar**, care arată aceeași fizică fără nicio substanță periculoasă.

## Simulări 3D

Toate cele trei montaje sunt desenate **în 3D**, cu un motor de randare scris special pentru aplicație (`engine3d.js`): proiecție în perspectivă, sortare după adâncime, umbrire după direcția luminii și umbre pe masă. Fără WebGL, fără biblioteci — merge pe orice calculator de școală și offline.

- **Trage cu mouse-ul (sau cu degetul)** ca să rotești montajul în jurul lui și să-l privești din orice unghi.
- **Rotița mouse-ului** apropie și depărtează.
- Butonul **Vedere inițială** readuce camera în poziția de pornire.

Perspectiva liberă contează didactic: din față se vede cum se învârte sârma motorului, de sus se vede exact cum stă acul busolei față de spire, iar din lateral se vede că sârma de pe șine chiar plutește deasupra magnetului.

## Cele trei moduri

### 1. Busola lui Oersted
O cutie de carton cu busola înăuntru și sârmă înfășurată în jurul ei. Copilul pornește curentul și acul sare. Apoi schimbă **numărul de spire (0–40)** fără să schimbe bateria și vede cum deviația crește: 5 spire ≈ 25°, 40 de spire ≈ 80°. Inversarea bateriei trimite acul în partea opusă, iar la oprirea curentului acul se întoarce singur spre nord.

| Reglaj | Ce descoperă |
|---|---|
| Spire 0 → 40 | mai multe spire = câmp mai puternic, aceeași baterie |
| Baterii 1 → 3 | curent mai mare = deviație mai mare |
| Inversează bateria | sensul curentului decide sensul deviației |
| Oprire | câmpul magnetic există doar cât curge curentul |

### 2. Șinele
Două șine de cupru legate la baterie, un magnet dedesubt și o sârmă liberă pusă peste ele. La pornirea curentului sârma **pleacă singură** într-o parte, împinsă de forța electromagnetică (o săgeată verde arată sensul forței).

**Tabelul cu patru combinații se completează singur pe ecran**, pe măsură ce copilul le încearcă:

| Bateria | Magnetul | Rezultat |
|---|---|---|
| normal | normal | dreapta → |
| invers | normal | stânga ← |
| normal | întors | stânga ← |
| invers | întors | dreapta → |

Regula pe care o descoperă singur: *schimbi una → invers; schimbi amândouă → la fel ca la început*. Este și o idee de matematică, nu doar de fizică.

### 3. Motorul care se învârte (homopolar)
Baterie AA, magnet de neodim lipit de ea și o sârmă de cupru îndoită. Motorul se rotește, iar aplicația numără **rotațiile** și calculează **rotațiile pe minut** — exact măsurătoarea din fișa de lucru.

Două detalii pedagogice intenționate:
- **Termometrul firului urcă** și, după circa 25 de secunde de mers continuu, motorul **se oprește singur** cu mesajul că trebuie pauză. Regula de siguranță din viața reală (contact 10–15 secunde) se învață aici prin joc.
- **Bateria se descarcă** vizibil: un motor consumă energie.

Întoarcerea magnetului schimbă sensul de rotație; un magnet slab abia urnește motorul.

### 4. Quiz
Șase întrebări cu explicație imediată, opțiuni amestecate la fiecare reluare, inclusiv întrebarea despre de ce se fac pauze.

## Caracteristici

- **Bilingv RO / EN**, comutare instantanee din antet (toate textele, mesajele și quizul)
- **Temă deschisă / întunecată**, memorată în browser
- Merge pe telefon, tabletă și calculator; canvas redimensionabil, control prin atingere
- Zero dependențe, zero trafic de rețea

## Structura

```
index.html      – pagina și structura celor 4 moduri
style.css       – stilurile, inclusiv tema întunecată
engine3d.js     – motorul 3D (proiecție, corpuri, umbrire, control orbital)
i18n.js         – toate textele, în română și engleză
app.js          – cele trei scene 3D, fizica simulată și quizul
.github/workflows/pages.yml
```

Fișierele stau direct în rădăcina repository-ului (fără subfolderul `assets/`), ca să poată fi urcate pe GitHub dintr-o singură selecție, prin interfața web.

## Publicare pe GitHub Pages

Workflow-ul inclus publică automat la fiecare `push` pe `main`. În *Settings → Pages → Source* trebuie ales **GitHub Actions**.

## Licență

Codul: MIT (vezi `LICENSE`). Conținutul didactic poate fi folosit liber la clasă, cu menționarea sursei experimentelor.
