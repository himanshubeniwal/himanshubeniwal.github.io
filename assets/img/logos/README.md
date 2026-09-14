# Institution logos

Used by the Experience, Education and Teaching sections of `index.md`, in the
right-hand mark column (`.cv-marks`).

## Present

| File | Institution | Source |
|---|---|---|
| `tu-dresden.svg` | Technische Universität Dresden | tu-dresden.de (white mark, single fill recoloured to ink) |
| `scads-ai.png` | ScaDS.AI | scads.ai |
| `microsoft.png` | Microsoft Research | microsoft.com (favicon, 128px) |
| `university-of-virginia.png` | University of Virginia | virginia.edu |
| `iit-ropar.png` | IIT Ropar | iitrpr.ac.in |
| `tulas-institute.png` | Tula's Institute | tulas.edu.in |

## Still to add

These four sites could not be reached from the machine that set this up, so
their rows currently fall back to a typographic wordmark. To use the real mark,
drop the file in with the name below and replace the matching

    <div class="cv-marks"><span class="cv-wordmark">…</span></div>

in `index.md` with

    <div class="cv-marks"><img src="./assets/img/logos/<file>" alt="…"></div>

| Expected file | Institution |
|---|---|
| `iit-gandhinagar.png` | Indian Institute of Technology Gandhinagar |
| `central-university-of-punjab.png` | Central University of Punjab |
| `hnb-garhwal-university.png` | Hemvati Nandan Bahuguna Garhwal University |
| `da-iict.png` | DA-IICT |

Any web format works (PNG, SVG, WebP). The column renders at up to 132×54 px,
so roughly 300 px wide is ample. Transparent backgrounds look best; the dark
theme puts a white plate behind each mark automatically.
