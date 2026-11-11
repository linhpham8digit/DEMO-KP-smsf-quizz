# KP SMSF quiz

The Fundwise Capital SMSF quiz for Kien Phan (version B of the SMSF ad test): one question per screen, then contact details, then a short "done" screen before it sends people on to the SMSF landing page, which then shows without its form.
Static HTML, CSS and JS, no build step. Deploy on Vercel as a static site (framework preset "Other").

Run locally: `npx -y serve -l 3009 .` then open http://localhost:3009

Where it sends people when they finish is the `data-thanks` value on `#quiz` in `index.html`, currently `https://demo-kp-smsf-landingpage.vercel.app/`. Change it to the landing page's real domain once that exists.
The quiz is not connected yet: finishing it does not send the lead anywhere (see `assets/js/lead.js`).
